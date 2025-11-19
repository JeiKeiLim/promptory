/**
 * Monaco Editor 기반 프롬프트 편집기
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { marked } from 'marked';
import { parseParameters, convertToPromptParameters } from '@renderer/utils/parameterParser';
import { ParameterEditor } from '@renderer/components/parameter/ParameterEditor';
import { useTranslation } from 'react-i18next';
import { highlightText, shouldHighlightTags } from '@renderer/utils/tagHighlighter';

// Monaco Editor 타입 정의
type MonacoEditor = Parameters<NonNullable<React.ComponentProps<typeof Editor>['onMount']>>[0];

// Monaco 전역 객체 타입 선언 (런타임에서만 사용 가능)
declare global {
  const monaco: any;
}
import { useAppStore } from '@renderer/stores/useAppStore';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import { toast } from '@renderer/components/common/ToastContainer';
import type { PromptFile, PromptMetadata, PromptParameter } from '@shared/types/prompt';
// yamlParser는 메인 프로세스에서만 사용 가능하므로 렌더러에서는 직접 파싱하지 않고 IPC를 통해 검증

interface PromptEditorProps {
  prompt?: PromptFile; // 새 프롬프트 생성 시에는 undefined
  isNewPrompt?: boolean; // 새 프롬프트 생성 모드
  onSave?: (updatedPrompt: PromptFile) => void;
  onCancel?: () => void;
  searchContext?: {
    query: string;
    isActive: boolean;
  };
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  isNewPrompt = false,
  onSave,
  onCancel,
  searchContext
}) => {
  const { t } = useTranslation();
  // 메타데이터 상태
  const [title, setTitle] = useState(prompt?.metadata.title || '');
  const [description, setDescription] = useState(prompt?.metadata.description || '');
  const [tags, setTags] = useState<string[]>(prompt?.metadata.tags || []);
  const [favorite, setFavorite] = useState(prompt?.metadata.favorite || false);
  const [folderPath, setFolderPath] = useState(() => {
    if (isNewPrompt || !prompt) return '';
    // 파일 경로에서 폴더 경로 추출
    const pathParts = prompt.path.split('/');
    return pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
  });

  // 마크다운 부분만 편집 (YAML 헤더는 별도 관리)
  const [markdownContent, setMarkdownContent] = useState(() => {
    if (isNewPrompt || !prompt) {
      return `# ${title || t('editor.newPrompt')}

${description || ''}

${t('editor.templateContent')}

## ${t('editor.usageExample')}

\`\`\`
${t('editor.exampleContent')}
\`\`\``;
    }

    // 기존 프롬프트에서 마크다운 부분만 추출
    const lines = prompt.content.split('\n');
    let contentStartIndex = 0;

    if (lines[0]?.trim() === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i]?.trim() === '---') {
          contentStartIndex = i + 1;
          break;
        }
      }
    }

    return lines.slice(contentStartIndex).join('\n').trim();
  });
  
  // 원본 YAML 헤더 보존
  const [yamlHeader, setYamlHeader] = useState(() => {
    if (isNewPrompt || !prompt) {
      return `---
title: "${title}"
description: "${description}"
tags: [${tags.map(tag => `"${tag}"`).join(', ')}]
favorite: ${favorite}
created_at: "${new Date().toISOString()}"
parameters: []
---`;
    }

    const lines = prompt.content.split('\n');
    let yamlEndIndex = -1;

    if (lines[0]?.trim() === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i]?.trim() === '---') {
          yamlEndIndex = i;
          break;
        }
      }
    }

    if (yamlEndIndex > 0) {
      return lines.slice(0, yamlEndIndex + 1).join('\n');
    }

    // YAML 헤더가 없으면 기본 생성
    return `---
title: "${prompt.metadata.title}"
description: "${prompt.metadata.description || ''}"
tags: [${prompt.metadata.tags.map(tag => `"${tag}"`).join(', ')}]
favorite: ${prompt.metadata.favorite}
created_at: "${prompt.metadata.created_at}"
parameters: []
---`;
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // 파라미터 관련 상태
  const [parameters, setParameters] = useState<PromptParameter[]>(prompt?.metadata.parameters || []);
  const [detectedParams, setDetectedParams] = useState<string[]>([]);
  const [showParameterEditor, setShowParameterEditor] = useState(false);
  const [showMetadataEditor, setShowMetadataEditor] = useState(isNewPrompt); // 새 프롬프트일 때는 기본으로 열기
  
  const editorRef = useRef<MonacoEditor | null>(null);
  const { setUnsavedChanges } = useAppStore();
  const { updatePrompt } = usePromptStore();

  // 사용 가능한 폴더 목록 상태
  const [availableFolders, setAvailableFolders] = React.useState<string[]>(['']);

  // 폴더 목록 로드
  React.useEffect(() => {
    const loadFolders = async () => {
      try {
        const result = await window.electronAPI.invoke('folder:list');
        if (result.success) {
          const folders = ['', ...result.data.map((f: any) => f.path)];
          setAvailableFolders(folders);
        }
      } catch (error) {
        console.error('Failed to load folders:', error);
      }
    };
    
    loadFolders();
  }, []); // 컴포넌트 마운트 시 한 번만 로드

  // 새 프롬프트 모드로 전환될 때 모든 상태 초기화
  useEffect(() => {
    if (isNewPrompt) {
      setTitle('');
      setDescription('');
      setTags([]);
      setFavorite(false);
      setFolderPath(''); // 폴더 경로도 초기화
      setParameters([]);
      setDetectedParams([]);
      setShowParameterEditor(false);
      setShowMetadataEditor(true); // 새 프롬프트일 때는 메타데이터 에디터 열기
      setHasChanges(false);
      setUnsavedChanges(false);
      setParseError(null);
      
      // 마크다운 내용 초기화
      const newContent = `# ${t('editor.newPrompt')}

${t('editor.templateContent')}

## ${t('editor.usageExample')}

\`\`\`
${t('editor.exampleContent')}
\`\`\``;
      setMarkdownContent(newContent);
    }
  }, [isNewPrompt, setUnsavedChanges]);

  // 편집 내용 변경 감지
  useEffect(() => {
    if (isNewPrompt) {
      // 새 프롬프트는 항상 변경사항이 있다고 간주
      const hasAnyContent = Boolean(title.trim() || description.trim() || tags.length > 0 || markdownContent.trim());
      setHasChanges(hasAnyContent);
      setUnsavedChanges(hasAnyContent);
    } else if (prompt) {
      const originalMarkdown = prompt.content.split('\n').slice(
        prompt.content.split('\n').findIndex((line, i) =>
          i > 0 && line.trim() === '---'
        ) + 1
      ).join('\n').trim();

      const metadataChanged = 
        title !== prompt.metadata.title ||
        description !== prompt.metadata.description ||
        JSON.stringify(tags) !== JSON.stringify(prompt.metadata.tags) ||
        favorite !== prompt.metadata.favorite;

      const contentChanged = markdownContent !== originalMarkdown;
      
      // 폴더 경로 변경 감지
      const originalFolderPath = (() => {
        if (isNewPrompt || !prompt) return '';
        const pathParts = prompt.path.split('/');
        return pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
      })();
      const folderChanged = folderPath !== originalFolderPath;
      
      const changed = metadataChanged || contentChanged || folderChanged;
      
      setHasChanges(changed);
      setUnsavedChanges(changed);
    }
  }, [markdownContent, title, description, tags, favorite, folderPath, prompt, isNewPrompt, setUnsavedChanges]);

  // 앱 설정 가져오기
  const { settings } = useAppStore();
  
  // 태그 하이라이트 활성화 조건 체크
  const searchQuery = searchContext?.query || '';
  const isSearchActive = searchContext?.isActive || false;
  
  const highlightCheckResult = useMemo(
    () => shouldHighlightTags(isSearchActive, settings, searchQuery),
    [isSearchActive, settings, searchQuery]
  );

  // 태그 하이라이트 함수
  const highlightTagIfNeeded = useCallback(
    (tag: string) => {
      if (!highlightCheckResult.shouldHighlight) return tag;
      return highlightText(tag, searchQuery);
    },
    [highlightCheckResult, searchQuery]
  );
  
  // Monaco 에디터 옵션 (설정값 적용)
  const editorOptions = useMemo(() => ({
    fontSize: 14,
    lineHeight: 1.6,
    wordWrap: settings.editor?.wordWrap ? 'on' as const : 'off' as const,
    lineNumbers: settings.editor?.showLineNumbers ? 'on' as const : 'off' as const,
    tabSize: 2,
    fontFamily: "Monaco, 'Cascadia Code', 'Fira Code', monospace",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    renderWhitespace: 'boundary' as const
  }), [settings.editor]);
  
  // 에디터 옵션이 변경되면 실시간으로 업데이트
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions(editorOptions);
    }
  }, [editorOptions]);

  // 에디터 마운트 시 설정
  const handleEditorDidMount = (editor: MonacoEditor) => {
    editorRef.current = editor;

    // 키보드 단축키 설정 (Cmd+S)
    editor.addCommand(
      2048 | 49, // CtrlCmd + KeyS
      () => handleSave()
    );

    // 에디터 옵션 설정 (이미 useMemo로 생성된 옵션이 적용됨)
    editor.updateOptions(editorOptions);
  };

  // 커스텀 이벤트 리스너 등록
  useEffect(() => {
    const handleSaveAndSwitch = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { targetPrompt } = customEvent.detail;
      await handleSave();
      // 저장 완료 후 대상 프롬프트로 전환
      setTimeout(() => {
        const { hideConfirmDialog } = useAppStore.getState();
        hideConfirmDialog(); // 다이얼로그 닫기
        
        const response = window.electronAPI.invoke('file:read', targetPrompt.path);
        response.then((res: any) => {
          if (res.success) {
            const { selectPrompt } = usePromptStore.getState();
            const { setEditingPrompt } = useAppStore.getState();
            setEditingPrompt(null);
            selectPrompt(res.data);
            // 로드 완료 토스트 제거 (자동 전환이므로 불필요)
          }
        });
      }, 100);
    };

    const handleSaveAndCreateNew = async () => {
      await handleSave();
      // 저장 완료 후 새 프롬프트 생성
      setTimeout(() => {
        const { selectPrompt } = usePromptStore.getState();
        const { setEditingPrompt, setUnsavedChanges, hideConfirmDialog } = useAppStore.getState();
        console.log('Save completed - switching to new prompt mode');
        hideConfirmDialog(); // 다이얼로그 닫기
        selectPrompt(null);
        setEditingPrompt('new-prompt');
        setUnsavedChanges(false); // 새 프롬프트 모드에서는 변경사항 없음으로 시작
      }, 100);
    };

    const handleSaveAndExitEdit = async () => {
      await handleSave();
      // 저장 완료 후 편집 모드 종료
      setTimeout(() => {
        const { setEditingPrompt, hideConfirmDialog } = useAppStore.getState();
        console.log('Save completed - exiting edit mode');
        hideConfirmDialog(); // 다이얼로그 닫기
        setEditingPrompt(null);
      }, 100);
    };

    window.addEventListener('save-and-switch-prompt', handleSaveAndSwitch);
    window.addEventListener('save-and-create-new', handleSaveAndCreateNew);
    window.addEventListener('save-and-exit-edit', handleSaveAndExitEdit);

    return () => {
      window.removeEventListener('save-and-switch-prompt', handleSaveAndSwitch);
      window.removeEventListener('save-and-create-new', handleSaveAndCreateNew);
      window.removeEventListener('save-and-exit-edit', handleSaveAndExitEdit);
    };
  }, []);

  // 마크다운 내용 검증 (기본적인 검증만)
  const validateContent = (markdownText: string): { isValid: boolean; error?: string } => {
    // 마크다운 내용은 기본적으로 유효하다고 가정
    // 필요시 추가 검증 로직 구현
    return { isValid: true };
  };

  // 내용 변경 처리
  const handleContentChange = (value: string | undefined) => {
    if (value === undefined) return;
    
    setMarkdownContent(value);
    
    // 파라미터 자동 감지
    const parsedParams = parseParameters(value);
    const detectedParamNames = parsedParams.map(p => p.name);
    setDetectedParams(detectedParamNames);
    
    // 새로 감지된 파라미터를 자동으로 추가
    const existingParamNames = parameters.map(p => p.name);
    const newParamNames = detectedParamNames.filter(name => !existingParamNames.includes(name));
    
    if (newParamNames.length > 0) {
      const newParams = newParamNames.map(name => ({
        name,
        type: 'string' as const,
        required: true,
        description: `${name} 파라미터`
      }));
      
      setParameters(prev => [...prev, ...newParams]);
    }
    
    // 사용되지 않는 파라미터 제거 (선택적)
    const unusedParams = parameters.filter(param => !detectedParamNames.includes(param.name));
    if (unusedParams.length > 0) {
      setParameters(prev => prev.filter(param => detectedParamNames.includes(param.name)));
    }
    
    // 실시간 마크다운 검증
    const validation = validateContent(value);
    if (!validation.isValid) {
      setParseError(validation.error || null);
    } else {
      setParseError(null);
    }
  };

  // 저장 처리
  const handleSave = async () => {
    if (!hasChanges || isSaving) return; // 이미 저장 중이면 중복 실행 방지

    // 제목 필수 검증
    if (!title.trim()) {
      toast.error(t('toast.error'));
      return;
    }

    // 최종 검증
    const validation = validateContent(markdownContent);
    if (!validation.isValid) {
      toast.error(`${t('toast.error')}: ${validation.error}`);
      return;
    }

    setIsSaving(true);

    try {
      // 메타데이터 구성
      const metadata = {
        title: title.trim(),
        description: description.trim(),
        tags,
        favorite,
        created_at: prompt?.metadata.created_at || new Date().toISOString(),
        parameters
      };

      // 업데이트된 YAML 헤더 생성 (파라미터 포함)
      const updatedYamlHeader = `---
title: "${metadata.title}"
description: "${metadata.description}"
tags: [${metadata.tags.map(tag => `"${tag}"`).join(', ')}]
favorite: ${metadata.favorite}
created_at: "${metadata.created_at}"
parameters:${parameters.length === 0 ? ' []' : ''}${parameters.map(param => `
  - name: "${param.name}"
    type: "${param.type}"
    required: ${param.required}${param.description ? `
    description: "${param.description}"` : ''}${param.options && param.options.length > 0 ? `
    options: [${param.options.map((opt: string) => `"${opt}"`).join(', ')}]` : ''}`).join('')}
---`;

      // YAML 헤더 + 마크다운 내용 결합
      const fullContent = updatedYamlHeader + '\n\n' + markdownContent;

      let response;
      
      if (isNewPrompt) {
        // 새 프롬프트 생성
        response = await window.electronAPI.invoke('file:create', {
          folderPath: folderPath || undefined, // 폴더 경로 포함
          metadata,
          content: markdownContent
        });
      } else if (prompt) {
        // 기존 프롬프트 업데이트
        const oldFolderPath = (() => {
          const pathParts = prompt.path.split('/');
          return pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
        })();
        
        // 폴더가 변경되었는지 확인
        const folderChanged = oldFolderPath !== folderPath;
        
        const updateData = {
          content: fullContent,
          newFolderPath: folderChanged ? folderPath : undefined
        };
        
        response = await window.electronAPI.invoke('file:update', prompt.path, updateData);
      } else {
        throw new Error('프롬프트 정보가 없습니다.');
      }

      if (response.success) {
        const savedPrompt = response.data;
        
        if (isNewPrompt) {
          // 새 프롬프트 생성 성공
          toast.success(t('editor.newPromptCreated', { title: title.trim() }));
          
          // 편집 모드 해제 및 새로 생성된 프롬프트 선택
          const { setEditingPrompt } = useAppStore.getState();
          const { selectPrompt } = usePromptStore.getState();
          
          selectPrompt(savedPrompt); // 새로 생성된 프롬프트 선택
          setEditingPrompt(null); // 편집 모드 해제
        } else {
          // 기존 프롬프트 업데이트 성공
          toast.success(t('editor.promptSaved'));
          
          // 프롬프트 스토어 업데이트 및 새 경로로 선택
          if (prompt) {
            const { selectPrompt } = usePromptStore.getState();
            // 저장된 프롬프트로 다시 선택 (새 경로 포함)
            selectPrompt(savedPrompt);
          }
        }
        
        // 현재 편집 중인 프롬프트 정보 업데이트
        setParameters(savedPrompt.metadata?.parameters || []);
        
        // 부모 컴포넌트에 업데이트된 프롬프트 전달
        onSave?.(savedPrompt);
        
        // 전체 프롬프트 목록 새로고침 (사이드바 등 업데이트)
        const { refreshData } = usePromptStore.getState();
        await refreshData(); // await 추가로 완전한 새로고침 대기
        
        setHasChanges(false);
        setUnsavedChanges(false);
        
        // 편집 모드 강제 종료 (새 프롬프트가 아닌 경우에도)
        if (!isNewPrompt) {
          const { setEditingPrompt } = useAppStore.getState();
          setEditingPrompt(null);
        }
        
      } else {
        toast.error(`${t('editor.saveFailed')}: ${response.error?.message}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('editor.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  // 취소 처리
  const handleCancel = () => {
    if (hasChanges) {
      // 확인 다이얼로그 표시
      const { showConfirmDialog, hideConfirmDialog } = useAppStore.getState();
      showConfirmDialog(
        t('confirm.saveChanges'),
        t('confirm.unsavedChanges'),
        () => {
          // 저장 후 취소
          hideConfirmDialog();
          handleSave().then(() => onCancel?.());
        },
        () => {
          // 저장하지 않고 취소
          hideConfirmDialog();
          if (!isNewPrompt && prompt) {
            // 원본 마크다운 내용으로 복원
            const originalMarkdown = prompt.content.split('\n').slice(
              prompt.content.split('\n').findIndex((line, i) => 
                i > 0 && line.trim() === '---'
              ) + 1
            ).join('\n').trim();
            setMarkdownContent(originalMarkdown);
          }
          setHasChanges(false);
          setUnsavedChanges(false);
          onCancel?.();
        },
        () => {
          // 취소 버튼 클릭 (다이얼로그만 닫기)
          hideConfirmDialog();
        }
      );
    } else {
      onCancel?.();
    }
  };



  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isNewPrompt ? t('editor.newPrompt') : t('editor.editPrompt')}
          </h2>
          
          {hasChanges && (
            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
              *
            </span>
          )}
          
          {parseError && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
              {t('toast.error')}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 메타데이터 및 파라미터 토글 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
                   <button
                     onClick={() => {
                       setShowMetadataEditor(!showMetadataEditor);
                       if (!showMetadataEditor) {
                         setShowParameterEditor(false); // 정보 탭 열 때 파라미터 탭 닫기
                       }
                     }}
                     className={`px-3 py-1 text-sm rounded-md transition-colors ${
                       showMetadataEditor
                         ? 'bg-white text-gray-900 shadow-sm'
                         : 'text-gray-600 hover:text-gray-900'
                     }`}
                   >
                     {t('editor.metadata')}
                   </button>
                   <button
                     onClick={() => {
                       setShowParameterEditor(!showParameterEditor);
                       if (!showParameterEditor) {
                         setShowMetadataEditor(false); // 파라미터 탭 열 때 정보 탭 닫기
                       }
                     }}
                     className={`px-3 py-1 text-sm rounded-md transition-colors relative ${
                       showParameterEditor
                         ? 'bg-white text-gray-900 shadow-sm'
                         : 'text-gray-600 hover:text-gray-900'
                     }`}
                   >
                     {t('editor.parameters')}
                     {detectedParams.length > 0 && (
                       <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                         {detectedParams.length}
                       </span>
                     )}
                   </button>
          </div>
          
          {/* 액션 버튼 */}
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            {t('editor.cancel')}
          </button>
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !!parseError}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('editor.save')}
          </button>
        </div>
      </div>

      {/* 에러 표시 */}
      {parseError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="text-sm text-red-800">
            <strong>YAML 파싱 오류:</strong> {parseError}
          </div>
        </div>
      )}

      {/* 에디터/미리보기 영역 */}
      <div className="flex-1 overflow-hidden">
        {showMetadataEditor || showParameterEditor ? (
          /* 파라미터 에디터가 활성화된 경우 - 세로 분할 */
          <div className="h-full flex flex-col">
            {/* 상단: 편집기 */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={markdownContent}
                onChange={handleContentChange}
                onMount={handleEditorDidMount}
                theme="vs-light"
                options={{ ...editorOptions, automaticLayout: true }}
              />
            </div>

            {/* 구분선 */}
            <div className="h-px bg-gray-200"></div>

            {/* 하단: 메타데이터/파라미터 에디터 */}
            <div className="h-80 bg-gray-50 overflow-y-auto border-t border-gray-200">
              <div className="p-4">
                {showMetadataEditor && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-md font-semibold text-gray-800">{t('editor.metadata')}</h3>
                    
                    {/* 제목 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('editor.title')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('editor.titlePlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={200}
                      />
                    </div>

                    {/* 폴더 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('editor.folder')}
                      </label>
                      <select
                        value={folderPath}
                        onChange={(e) => setFolderPath(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t('editor.rootFolder')}</option>
                        {availableFolders.filter(f => f !== '').map((folder) => (
                          <option key={folder} value={folder}>
                            {folder}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 설명 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('editor.description')}
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('editor.descriptionPlaceholder')}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        maxLength={1000}
                      />
                      <p className="mt-1 text-xs text-gray-500">{description.length}/1000</p>
                    </div>

                    {/* 태그 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('editor.tags')}
                      </label>
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          placeholder={t('editor.tagsPlaceholder')}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              const newTag = input.value.trim();
                              if (newTag && !tags.includes(newTag)) {
                                setTags([...tags, newTag]);
                                input.value = '';
                              }
                            }
                          }}
                        />
                      </div>
                      
                      {/* 태그 목록 */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            >
                              #{highlightTagIfNeeded(tag)}
                              <button
                                type="button"
                                onClick={() => setTags(tags.filter(t => t !== tag))}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 즐겨찾기 */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="favorite"
                        checked={favorite}
                        onChange={(e) => setFavorite(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="favorite" className="ml-2 block text-sm text-gray-900">
                        {t('editor.favorite')}
                      </label>
                    </div>
                  </div>
                )}

                {showParameterEditor && (
                  <ParameterEditor
                    parameters={parameters}
                    onChange={setParameters}
                    detectedParams={detectedParams}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 파라미터 에디터가 비활성화된 경우 - 전체 화면 */
          <div className="h-full">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={markdownContent}
              onChange={handleContentChange}
              onMount={handleEditorDidMount}
              theme="vs-light"
              options={{ ...editorOptions, automaticLayout: true }}
            />
          </div>
        )}
      </div>

      {/* 하단 상태바 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <div>
            {isNewPrompt ? t('editor.newPrompt') : (prompt?.modifiedAt ? `${t('editor.modifiedAt')}: ${new Date(prompt.modifiedAt).toLocaleString()}` : t('editor.noModifiedTime'))}
          </div>
          <div className="flex items-center space-x-4">
            <span>Cmd+S: {t('editor.save')}</span>
            <span>{markdownContent.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
