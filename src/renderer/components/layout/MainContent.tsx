/**
 * 중앙 메인 콘텐츠 (프롬프트 목록)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { toast } from '@renderer/components/common/ToastContainer';
import { SearchBar } from '@renderer/components/search/SearchBar';

export const MainContent: React.FC = () => {
  const { 
    prompts, 
    getFilteredPrompts, 
    selectPrompt, 
    selectedPrompt, 
    refreshData, 
    isLoading, 
    error 
  } = usePromptStore();

  const { setEditingPrompt } = useAppStore();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 검색이 활성화되어 있으면 검색 결과를, 아니면 필터된 프롬프트를 사용
  const displayPrompts = isSearchActive ? searchResults : getFilteredPrompts();

  // 검색 키워드 하이라이트 함수
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query || !isSearchActive) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  }, [isSearchActive]);

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
        '변경사항 저장',
        '저장하지 않은 변경사항이 있습니다. 어떻게 하시겠습니까?',
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
        toast.error(`파일 로드 실패: ${response.error?.message}`);
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
      toast.error('파일 로드 중 오류가 발생했습니다.');
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
            프롬프트 ({displayPrompts.length})
            {isLoading && (
              <span className="ml-2 text-sm text-gray-500">로딩 중...</span>
            )}
          </h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-3 py-1 text-sm border theme-border-primary rounded theme-button-secondary button-press disabled:opacity-50"
            >
              새로고침
            </button>
                   <button 
                     onClick={() => {
                       const { editingPromptId, hasUnsavedChanges, showConfirmDialog } = useAppStore.getState();
                       
                       // 편집 중이고 변경사항이 있는 경우 확인 다이얼로그 표시
                       if (editingPromptId && hasUnsavedChanges) {
                         showConfirmDialog(
                           '변경사항 저장',
                           '저장하지 않은 변경사항이 있습니다. 어떻게 하시겠습니까?',
                           () => {
                             // 저장 후 새 프롬프트 생성
                             window.dispatchEvent(new CustomEvent('save-and-create-new'));
                           },
                           () => {
                             // 저장하지 않고 새 프롬프트 생성
                             const { hideConfirmDialog } = useAppStore.getState();
                             hideConfirmDialog();
                             proceedToCreateNew();
                           }
                         );
                         return;
                       }
                       
                       // 변경사항이 없거나 편집 중이 아닌 경우 바로 새 프롬프트 생성
                       proceedToCreateNew();
                     }}
                     className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 button-press"
                   >
                     새 프롬프트
                   </button>
          </div>
        </div>
        {error && (
          <div className="mt-2 text-sm text-red-600">
            오류: {error}
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
            <h3 className="text-lg font-medium mb-2">프롬프트가 없습니다</h3>
            <p className="text-sm">새 프롬프트를 만들어 시작하세요.</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {displayPrompts.map((prompt, index) => (
              <div
                key={prompt.id}
                onClick={() => handlePromptClick(prompt)}
                className={`p-3 rounded-lg border cursor-pointer card-hover list-item-enter ${
                  selectedPrompt?.id === prompt.id
                    ? 'bg-blue-50 border-blue-300 shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
                style={{
                  animationDelay: `${index * 0.05}s`
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {highlightMatch(prompt.metadata.title, searchQuery)}
                    </h3>
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
                          <span>{prompt.metadata.tags.slice(0, 2).join(', ')}</span>
                          {prompt.metadata.tags.length > 2 && (
                            <span> +{prompt.metadata.tags.length - 2}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {prompt.metadata.favorite && (
                    <div className="ml-2 text-yellow-500">⭐</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
