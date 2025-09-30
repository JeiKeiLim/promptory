/**
 * 좌측 사이드바 컴포넌트
 */

import React, { useEffect } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { toast } from '@renderer/components/common/ToastContainer';
import { InputDialog } from '@renderer/components/common/InputDialog';

export const Sidebar: React.FC = () => {
  const { 
    prompts, 
    favorites, 
    tags, 
    currentFilter, 
    setFilter,
    refreshData
  } = usePromptStore();
  
  const { collapsedSections, toggleSection, showSettingsModal } = useAppStore();
  
  // 태그 더 보기 상태
  const [showAllTags, setShowAllTags] = React.useState(false);
  
  // 폴더 추가 다이얼로그 상태
  const [showFolderDialog, setShowFolderDialog] = React.useState(false);

  // 폴더 생성 핸들러
  const handleCreateFolder = async (folderName: string) => {
    try {
      const result = await window.electronAPI.invoke('folder:create', folderName);
      
      if (result.success) {
        toast.success(`폴더 "${folderName}"가 생성되었습니다.`);
        setShowFolderDialog(false);
        // 폴더 목록 새로고침
        await loadFolders();
        // 프롬프트 데이터도 새로고침
        await refreshData();
      } else {
        toast.error(`폴더 생성 실패: ${result.error?.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('폴더 생성 중 오류가 발생했습니다.');
    }
  };

  // 태그 섹션이 접혔다가 펼쳐질 때 "더 보기" 상태 초기화
  React.useEffect(() => {
    if (collapsedSections.tags) {
      setShowAllTags(false);
    }
  }, [collapsedSections.tags]);

  // 폴더 목록 상태
  const [folders, setFolders] = React.useState<Array<{ name: string; path: string; count: number }>>([]);

  // 폴더 목록 로드
  const loadFolders = React.useCallback(async () => {
    try {
      const result = await window.electronAPI.invoke('folder:list');
      if (result.success) {
        setFolders(result.data);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  }, []);

  // 초기 폴더 목록 로드 및 프롬프트 변경 시 재로드
  React.useEffect(() => {
    loadFolders();
  }, [prompts, loadFolders]); // prompts 배열 전체를 의존성으로 사용하여 경로 변경도 감지

  // 태그 통계 생성
  const tagStats = React.useMemo(() => {
    const tagMap = new Map<string, number>();
    
    prompts.forEach(prompt => {
      prompt.metadata.tags.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });
    
    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [prompts]);

  return (
    <div className="h-full flex flex-col theme-bg-secondary">
      <div className="p-4 border-b theme-border-primary flex items-center justify-between">
        <h1 className="text-lg font-semibold theme-text-primary">Promptory</h1>
        <button
          onClick={() => showSettingsModal()}
          className="p-1.5 theme-text-secondary theme-hover rounded-md transition-colors"
          title="설정"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* 전체 보기 */}
          <div>
            <button
              onClick={() => setFilter('all')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                currentFilter.type === 'all'
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              📁 전체 프롬프트 ({prompts.length})
            </button>
          </div>

          {/* 즐겨찾기 섹션 */}
          <div>
            <button
              onClick={() => toggleSection('favorites')}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
            >
              <span>⭐ 즐겨찾기</span>
              <span>{collapsedSections.favorites ? '▶' : '▼'}</span>
            </button>
            
            {!collapsedSections.favorites && (
              <div className="space-y-1">
                <button
                  onClick={() => setFilter('favorites')}
                  className={`w-full text-left px-3 py-1 rounded text-sm transition-colors ${
                    currentFilter.type === 'favorites'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  즐겨찾기 ({favorites.length})
                </button>
              </div>
            )}
          </div>
          
          {/* 폴더 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => toggleSection('folders')}
                className="flex items-center space-x-2 text-sm font-medium text-gray-700"
              >
                <span>📂 폴더</span>
                <span>{collapsedSections.folders ? '▶' : '▼'}</span>
              </button>
              {!collapsedSections.folders && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowFolderDialog(true);
                  }}
                  className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="새 폴더 추가"
                >
                  <span className="text-lg leading-none">+</span>
                </button>
              )}
            </div>
            
            {!collapsedSections.folders && (
              <div className="space-y-1">
                {folders.length === 0 ? (
                  <div className="text-sm text-gray-500 px-3">폴더가 없습니다.</div>
                ) : (
                  folders.map((folder) => (
                    <button
                      key={folder.path}
                      onClick={() => setFilter('folder', folder.path)}
                      className={`w-full text-left px-3 py-1 rounded text-sm transition-colors ${
                        currentFilter.type === 'folder' && currentFilter.value === folder.path
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      📁 {folder.name} ({folder.count})
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          
          {/* 태그 섹션 */}
          <div>
            <button
              onClick={() => toggleSection('tags')}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
            >
              <span>🏷️ 태그</span>
              <span>{collapsedSections.tags ? '▶' : '▼'}</span>
            </button>
            
            {!collapsedSections.tags && (
              <div className="space-y-1">
                {tagStats.length === 0 ? (
                  <div className="text-sm text-gray-500 px-3">태그가 없습니다.</div>
                ) : (
                  <>
                    {/* 표시할 태그 목록 */}
                    {(showAllTags ? tagStats : tagStats.slice(0, 10)).map((tag) => (
                      <button
                        key={tag.name}
                        onClick={() => setFilter('tag', tag.name)}
                        className={`w-full text-left px-3 py-1 rounded text-sm transition-colors ${
                          currentFilter.type === 'tag' && currentFilter.value === tag.name
                            ? 'bg-green-100 text-green-800'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        #{tag.name} ({tag.count})
                      </button>
                    ))}
                    
                    {/* 더 보기/접기 버튼 */}
                    {tagStats.length > 10 && (
                      <button
                        onClick={() => setShowAllTags(!showAllTags)}
                        className="w-full text-left px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      >
                        {showAllTags ? (
                          <>
                            ▲ 접기 ({tagStats.length - 10}개 숨기기)
                          </>
                        ) : (
                          <>
                            ▼ 더 보기 (+{tagStats.length - 10}개)
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 폴더 추가 다이얼로그 */}
      <InputDialog
        isOpen={showFolderDialog}
        title="새 폴더 추가"
        message="생성할 폴더 이름을 입력하세요"
        placeholder="폴더 이름"
        onConfirm={handleCreateFolder}
        onCancel={() => setShowFolderDialog(false)}
      />
    </div>
  );
};
