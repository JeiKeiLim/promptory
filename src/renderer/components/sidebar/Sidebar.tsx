/**
 * 좌측 사이드바 컴포넌트
 */

import React, { useEffect } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { toast } from '@renderer/components/common/ToastContainer';
import { InputDialog } from '@renderer/components/common/InputDialog';
import { useTranslation } from 'react-i18next';

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
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
        toast.success(t('toast.folderCreated'));
        setShowFolderDialog(false);
        // 폴더 목록 새로고침
        await loadFolders();
        // 프롬프트 데이터도 새로고침
        await refreshData();
      } else {
        toast.error(`${t('toast.error')}: ${result.error?.message || ''}`);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error(t('toast.error'));
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
    if (!window.electronAPI) {
      console.warn('Not running in Electron environment, skipping folder load');
      return;
    }
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
        <h1 className="text-lg font-semibold theme-text-primary">{t('sidebar.title')}</h1>
        <button
          onClick={() => showSettingsModal()}
          className="p-1.5 theme-text-secondary theme-hover rounded-md transition-colors"
          title={t('settings.settingsTitle')}
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
              📁 {t('app.name')} ({prompts.length})
            </button>
          </div>

          {/* 즐겨찾기 섹션 */}
          <div>
            <button
              onClick={() => toggleSection('favorites')}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
            >
              <span>⭐ {t('sidebar.favorites')}</span>
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
                  {t('sidebar.favorites')} ({favorites.length})
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
                <span>📂 {t('sidebar.folders')}</span>
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
                  title={t('sidebar.newFolder')}
                >
                  <span className="text-lg leading-none">+</span>
                </button>
              )}
            </div>
            
            {!collapsedSections.folders && (
              <div className="space-y-1">
                {folders.length === 0 ? (
                  <div className="text-sm text-gray-500 px-3">{t('sidebar.noFolders')}</div>
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
              <span>🏷️ {t('sidebar.tags')}</span>
              <span>{collapsedSections.tags ? '▶' : '▼'}</span>
            </button>
            
            {!collapsedSections.tags && (
              <div className="space-y-1">
                {tagStats.length === 0 ? (
                  <div className="text-sm text-gray-500 px-3">{t('sidebar.noTags')}</div>
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
                            ▲ {t('sidebar.showLess')} ({tagStats.length - 10}{t('sidebar.hiddenCount')})
                          </>
                        ) : (
                          <>
                            ▼ {t('sidebar.showMore')} (+{tagStats.length - 10}{t('sidebar.moreCount')})
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
        title={t('sidebar.newFolderTitle')}
        message={t('sidebar.newFolderMessage')}
        placeholder={t('sidebar.folderNamePlaceholder')}
        onConfirm={handleCreateFolder}
        onCancel={() => setShowFolderDialog(false)}
      />
    </div>
  );
};
