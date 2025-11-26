/**
 * 중앙 메인 콘텐츠 (프롬프트 목록)
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { toast } from '@renderer/components/common/ToastContainer';
import { SearchBar } from '@renderer/components/search/SearchBar';
import { FavoriteStar } from '@renderer/components/common/FavoriteStar';
import { useTranslation } from 'react-i18next';
import { highlightText, shouldHighlightTags } from '@renderer/utils/tagHighlighter';
import { LLMBadge } from '@renderer/components/llm/LLMBadge';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';

export const MainContent: React.FC = () => {
  const { t } = useTranslation();
  const { 
    prompts, 
    getFilteredPrompts, 
    selectPrompt, 
    selectedPrompt, 
    refreshData, 
    isLoading, 
    error 
  } = usePromptStore();

  const { setEditingPrompt, settings } = useAppStore();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // T092-T096: Debounced favorite toggle with optimistic UI and rollback
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const originalStatesRef = useRef<Map<string, boolean>>(new Map());
  
  // Handle favorite toggle with debouncing (300ms)
  const handleFavoriteToggle = useCallback(async (promptId: string, currentState: boolean) => {
    // T093: Optimistic UI update - store original state for rollback
    if (!originalStatesRef.current.has(promptId)) {
      originalStatesRef.current.set(promptId, currentState);
    }

    // Cancel pending debounce timer for this prompt
    const existingTimer = debounceTimersRef.current.get(promptId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // New desired state is opposite of current
    const newState = !currentState;

    // Set new debounce timer
    const timer = setTimeout(async () => {
      try {
        // T094: Call IPC to persist favorite status
        const result = await window.electronAPI.invoke(IPC_CHANNELS.PROMPT_UPDATE_FAVORITE, {
          id: promptId,
          favorite: newState,
        });

        if (result.success) {
          // Success - clear original state tracking
          originalStatesRef.current.delete(promptId);
          debounceTimersRef.current.delete(promptId);
        } else {
          throw new Error(result.error || 'Failed to update favorite');
        }
      } catch (error) {
        // T095: Rollback on failure
        const originalState = originalStatesRef.current.get(promptId);
        if (originalState !== undefined) {
          // Revert to original state in the store
          const prompt = prompts.find((p) => p.id === promptId);
          if (prompt) {
            prompt.metadata.favorite = originalState;
          }
        }

        // T096: Show error notification
        toast.error(t('errors.favoriteFailed', 'Failed to update favorite status'));
        
        // Clean up
        originalStatesRef.current.delete(promptId);
        debounceTimersRef.current.delete(promptId);
        
        console.error('Failed to toggle favorite:', error);
      }
    }, 300); // 300ms debounce

    debounceTimersRef.current.set(promptId, timer);
  }, [prompts, t]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);
  
  // 검색이 활성화되어 있으면 검색 결과를, 아니면 필터된 프롬프트를 사용
  const displayPrompts = isSearchActive ? searchResults : getFilteredPrompts();

  // 검색 키워드 하이라이트 함수 (설정값 적용)
  const highlightMatch = useCallback((text: string, query: string) => {
    const highlightEnabled = settings.search?.highlightMatches !== false;
    if (!query || !isSearchActive || !highlightEnabled) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  }, [isSearchActive, settings.search]);

  // 태그 하이라이트 활성화 조건 체크 (메모이제이션)
  const highlightCheckResult = useMemo(
    () => shouldHighlightTags(isSearchActive, settings, searchQuery),
    [isSearchActive, settings, searchQuery]
  );

  // 태그 텍스트 하이라이트 함수 (메모이제이션)
  const highlightTagText = useCallback(
    (text: string) => {
      if (!highlightCheckResult.shouldHighlight) return text;
      return highlightText(text, searchQuery);
    },
    [highlightCheckResult, searchQuery]
  );

  // 검색 결과 콜백 함수 메모이제이션
  const handleSearchResults = useCallback((results: any[], hasQuery: boolean, query: string) => {
    setSearchResults(results);
    setIsSearchActive(hasQuery);
    setSearchQuery(query);
  }, []);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handlePromptClick = async (promptInfo: any) => {
    const { editingPromptId, hasUnsavedChanges, showConfirmDialog } = useAppStore.getState();
    
    // 편집 중이고 변경사항이 있는 경우 확인 다이얼로그 표시
    if (editingPromptId && hasUnsavedChanges) {
      showConfirmDialog(
        t('confirm.saveChanges'),
        t('confirm.unsavedChanges'),
        () => {
          // 저장 후 전환 - 현재 편집 중인 프롬프트를 저장하고 새 프롬프트로 전환
          // 이 부분은 PromptEditor에서 처리하도록 이벤트 발생
          window.dispatchEvent(new CustomEvent('save-and-switch-prompt', { 
            detail: { targetPrompt: promptInfo } 
          }));
        },
        () => {
          // 저장하지 않고 전환
          const { hideConfirmDialog } = useAppStore.getState();
          hideConfirmDialog();
          proceedToLoadPrompt(promptInfo);
        },
        () => {
          // 취소 버튼 클릭 (다이얼로그만 닫기)
          const { hideConfirmDialog } = useAppStore.getState();
          hideConfirmDialog();
        }
      );
      return;
    }
    
    // 변경사항이 없거나 편집 중이 아닌 경우 바로 전환
    proceedToLoadPrompt(promptInfo);
  };

  const proceedToLoadPrompt = async (promptInfo: any) => {
    try {
      // 편집 모드 해제 (다른 프롬프트 선택 시)
      setEditingPrompt(null);
      
      // 실제 파일 내용을 로드
      const response = await window.electronAPI.invoke('file:read', promptInfo.path);
      if (response.success) {
        selectPrompt(response.data);
      } else {
        toast.error(`${t('mainContent.fileLoadFailed')}: ${response.error?.message}`);
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
      toast.error(t('mainContent.fileLoadError'));
    }
  };

  const proceedToCreateNew = () => {
    // 새 프롬프트 생성 모드로 전환
    selectPrompt(null); // 현재 선택 해제
    setEditingPrompt('new-prompt'); // 새 프롬프트 편집 모드
    
    // 강제로 unsaved changes 상태 초기화
    const { setUnsavedChanges } = useAppStore.getState();
    setUnsavedChanges(false);
  };

  const handleRefresh = () => {
    refreshData();
    // 새로고침 시 토스트 제거 (사용자가 직접 요청한 액션이므로 불필요)
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('mainContent.prompts')} ({displayPrompts.length})
            {isLoading && (
              <span className="ml-2 text-sm text-gray-500">{t('mainContent.loading')}</span>
            )}
          </h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-3 py-1 text-sm border theme-border-primary rounded theme-button-secondary button-press disabled:opacity-50"
            >
              {t('mainContent.refresh')}
            </button>
                   <button 
                     onClick={() => {
                       const { editingPromptId, hasUnsavedChanges, showConfirmDialog } = useAppStore.getState();
                       
                       // 편집 중이고 변경사항이 있는 경우 확인 다이얼로그 표시
                       if (editingPromptId && hasUnsavedChanges) {
                         showConfirmDialog(
                           t('confirm.saveChanges'),
                           t('confirm.unsavedChanges'),
                           () => {
                             // 저장 후 새 프롬프트 생성
                             window.dispatchEvent(new CustomEvent('save-and-create-new'));
                           },
                           () => {
                             // 저장하지 않고 새 프롬프트 생성
                             const { hideConfirmDialog } = useAppStore.getState();
                             hideConfirmDialog();
                             proceedToCreateNew();
                           },
                           () => {
                             // 취소 버튼 클릭 (다이얼로그만 닫기)
                             const { hideConfirmDialog } = useAppStore.getState();
                             hideConfirmDialog();
                           }
                         );
                         return;
                       }
                       
                       // 변경사항이 없거나 편집 중이 아닌 경우 바로 새 프롬프트 생성
                       proceedToCreateNew();
                     }}
                     className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 button-press"
                   >
                     {t('mainContent.newPrompt')}
                   </button>
          </div>
        </div>
        {error && (
          <div className="mt-2 text-sm text-red-600">
            {t('mainContent.error')}: {error}
          </div>
        )}
      </div>
      
      {/* 검색바 */}
      <div className="p-4 border-b border-gray-200">
        <SearchBar onSearchResults={handleSearchResults} />
      </div>
      
      {/* 프롬프트 목록 */}
      <div className="flex-1 overflow-y-auto">
        {displayPrompts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-medium mb-2">{t('mainContent.noPrompts')}</h3>
            <p className="text-sm">{t('mainContent.createFirst')}</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {displayPrompts.map((prompt, index) => (
              <div
                key={prompt.id}
                onClick={() => handlePromptClick(prompt)}
                className={`p-3 rounded-lg border cursor-pointer card-hover list-item-enter relative ${
                  selectedPrompt?.id === prompt.id
                    ? 'bg-blue-50 border-blue-300 shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
                style={{
                  animationDelay: `${index * 0.05}s`
                }}
              >
                {/* T098: Position FavoriteStar in top-right corner */}
                <div className="absolute top-2 right-2 z-10">
                  <FavoriteStar
                    promptId={prompt.id}
                    isFavorite={prompt.metadata.favorite || false}
                    onToggle={handleFavoriteToggle}
                  />
                </div>
                
                <div className="flex items-start justify-between pr-10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {highlightMatch(prompt.metadata.title, searchQuery)}
                      </h3>
                      <LLMBadge promptId={prompt.id} />
                    </div>
                    {prompt.metadata.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {highlightMatch(prompt.metadata.description, searchQuery)}
                      </p>
                    )}
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <span>{new Date(prompt.modifiedAt).toLocaleDateString()}</span>
                      {prompt.metadata.tags.length > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{highlightTagText(prompt.metadata.tags.slice(0, 2).join(', '))}</span>
                          {prompt.metadata.tags.length > 2 && (
                            <span> +{prompt.metadata.tags.length - 2}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
