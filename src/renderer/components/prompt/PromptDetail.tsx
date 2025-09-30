/**
 * 프롬프트 상세 보기 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import type { PromptFile } from '@shared/types/prompt';
import { PromptEditor } from '@renderer/components/editor/PromptEditor';
import { ParameterInputModal } from '@renderer/components/prompt/ParameterInputModal';
import { useAppStore } from '@renderer/stores/useAppStore';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import { toast } from '@renderer/components/common/ToastContainer';

interface PromptDetailProps {
  prompt: PromptFile | null; // 새 프롬프트 생성 시 null 허용
}

export const PromptDetail: React.FC<PromptDetailProps> = ({ prompt }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(prompt);
  const [showParameterModal, setShowParameterModal] = useState(false);
  const { editingPromptId, setEditingPrompt } = useAppStore();
  const { selectPrompt } = usePromptStore();

  // 키보드 단축키로 파라미터 모달 열기 이벤트 처리
  useEffect(() => {
    const handleOpenParameterModal = (event: CustomEvent) => {
      const { prompt } = event.detail;
      if (prompt && prompt.id === currentPrompt?.id) {
        setShowParameterModal(true);
      }
    };

    window.addEventListener('open-parameter-modal', handleOpenParameterModal as EventListener);
    return () => {
      window.removeEventListener('open-parameter-modal', handleOpenParameterModal as EventListener);
    };
  }, [currentPrompt]);

  // prompt prop이 변경되면 currentPrompt 업데이트
  React.useEffect(() => {
    setCurrentPrompt(prompt);
  }, [prompt]);

  // 편집 모드 자동 전환 (새로 생성된 프롬프트인 경우)
  React.useEffect(() => {
    
    if (prompt && editingPromptId === prompt.id && !isEditing) {
      setIsEditing(true);
    }
    // 새 프롬프트 생성 모드 - 기존 프롬프트 편집 중이어도 강제 전환
    if (editingPromptId === 'new-prompt' && !isEditing) {
      setIsEditing(true);
      // 새 프롬프트 모드에서는 currentPrompt를 null로 설정
      setCurrentPrompt(null);
    }
    // 편집 모드 해제 (editingPromptId가 null이 되었을 때)
    if (!editingPromptId && isEditing) {
      setIsEditing(false);
    }
  }, [editingPromptId, prompt?.id, isEditing]);

  const handleEditClick = () => {
    if (prompt) {
      setIsEditing(true);
      setEditingPrompt(prompt.id);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditingPrompt(null);
  };

  const handleEditSave = (updatedPrompt: PromptFile) => {
    // 새 프롬프트 생성이 아닌 경우에만 편집 모드 해제
    // (새 프롬프트는 PromptEditor에서 직접 처리)
    if (editingPromptId !== 'new-prompt') {
      setIsEditing(false);
      setEditingPrompt(null);
      
      // 현재 표시 중인 프롬프트 업데이트
      setCurrentPrompt(updatedPrompt);
      
      // 선택된 프롬프트도 업데이트
      selectPrompt(updatedPrompt);
    }
  };

  // 편집 모드인 경우 에디터 표시
  if (isEditing) {
    const isNewPromptMode = editingPromptId === 'new-prompt';
    return (
      <PromptEditor
        prompt={isNewPromptMode ? undefined : (currentPrompt || undefined)}
        isNewPrompt={isNewPromptMode}
        onSave={handleEditSave}
        onCancel={handleEditCancel}
      />
    );
  }
  // 새 프롬프트 모드 처리
  if (editingPromptId === 'new-prompt' && !isEditing) {
    setIsEditing(true);
    return null; // 다음 렌더에서 편집 모드로 표시됨
  }

  // 프롬프트가 없는 경우 (새 프롬프트 생성 모드가 아닌 경우)
  if (!prompt && editingPromptId !== 'new-prompt') {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium mb-2">프롬프트를 선택하세요</h3>
          <p className="text-sm">
            좌측에서 프롬프트를 선택하면 여기에 내용이 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-gray-900">
              {currentPrompt?.metadata?.title || '새 프롬프트'}
            </h1>
            {currentPrompt?.metadata?.favorite && (
              <span className="text-yellow-500">⭐</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowParameterModal(true)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              사용
            </button>
            <button 
              onClick={handleEditClick}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              편집
            </button>
            <button 
              onClick={() => {
                if (currentPrompt) {
                  const { showConfirmDialog } = useAppStore.getState();
                  showConfirmDialog(
                    '프롬프트 삭제',
                    `"${currentPrompt.metadata?.title || '제목 없음'}" 프롬프트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
                    async () => {
                      // 삭제 실행
                      try {
                        const { hideConfirmDialog } = useAppStore.getState();
                        hideConfirmDialog();
                        
                        const response = await window.electronAPI.invoke('file:delete', currentPrompt.path);
                        if (response.success) {
                          toast.success('프롬프트가 삭제되었습니다.');
                          // 프롬프트 목록 새로고침
                          const { refreshData, selectPrompt } = usePromptStore.getState();
                          selectPrompt(null); // 선택 해제
                          await refreshData();
                        } else {
                          toast.error(`삭제 실패: ${response.error?.message}`);
                        }
                      } catch (error) {
                        console.error('Delete error:', error);
                        toast.error('삭제 중 오류가 발생했습니다.');
                      }
                    },
                    () => {
                      // 취소 - 아무것도 하지 않음
                      const { hideConfirmDialog } = useAppStore.getState();
                      hideConfirmDialog();
                    },
                    {
                      saveButtonText: '삭제',
                      dontSaveButtonText: '취소',
                      cancelButtonText: '취소'
                    }
                  );
                }
              }}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              삭제
            </button>
          </div>
        </div>
        
        {currentPrompt?.metadata?.description && (
          <p className="text-gray-600 mt-2">{currentPrompt.metadata.description}</p>
        )}
        
        {/* 메타데이터 */}
        {currentPrompt && (
          <div className="flex items-center mt-3 text-sm text-gray-500 space-x-4">
            <span>생성: {currentPrompt.metadata?.created_at ? new Date(currentPrompt.metadata.created_at).toLocaleDateString() : '알 수 없음'}</span>
            <span>수정: {new Date(currentPrompt.modifiedAt).toLocaleDateString()}</span>
            <span>크기: {(currentPrompt.fileSize / 1024).toFixed(1)}KB</span>
          </div>
        )}
        
        {/* 태그 */}
        {currentPrompt && currentPrompt.metadata?.tags && currentPrompt.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {currentPrompt.metadata.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* 파라미터 */}
      {currentPrompt && currentPrompt.metadata?.parameters && currentPrompt.metadata.parameters.length > 0 && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">파라미터</h3>
          <div className="space-y-2">
            {currentPrompt.metadata.parameters.map((param) => (
              <div key={param.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono text-gray-900">{param.name}</span>
                  <span className="text-xs text-gray-500">({param.type})</span>
                  {param.required && (
                    <span className="text-xs text-red-500">*</span>
                  )}
                </div>
                {param.description && (
                  <span className="text-xs text-gray-500">{param.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 콘텐츠 */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
            {currentPrompt?.content || ''}
          </pre>
        </div>
      </div>

      {/* 파라미터 입력 모달 */}
      {currentPrompt && (
        <ParameterInputModal
          prompt={currentPrompt}
          isOpen={showParameterModal}
          onClose={() => setShowParameterModal(false)}
        />
      )}
    </div>
  );
};
