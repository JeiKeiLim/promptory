/**
 * 프롬프트 관련 상태 관리 (Zustand)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PromptFileInfo, PromptFile } from '@shared/types/prompt';

// 정렬 옵션
export type SortBy = 'name' | 'modified' | 'created';
export type SortOrder = 'asc' | 'desc';

// 폴더 트리 노드
export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  fileCount: number;
}

// 태그 정보
export interface TagInfo {
  name: string;
  count: number;
  lastUsed: string;
}

// 프롬프트 스토어 인터페이스
export interface PromptStore {
  // 데이터
  prompts: PromptFileInfo[];
  selectedPrompt: PromptFile | null;
  folders: FolderNode[];
  favorites: PromptFileInfo[];
  tags: TagInfo[];
  
  // 필터 및 정렬
  currentFilter: {
    type: 'all' | 'favorites' | 'folder' | 'tag';
    value?: string;
  };
  sortBy: SortBy;
  sortOrder: SortOrder;
  
  // 로딩 상태
  isLoading: boolean;
  error: string | null;
  
  // 액션
  setPrompts: (prompts: PromptFileInfo[]) => void;
  addPrompt: (prompt: PromptFileInfo) => void;
  updatePrompt: (id: string, updates: Partial<PromptFileInfo>) => void;
  removePrompt: (id: string) => void;
  
  selectPrompt: (prompt: PromptFile | null) => void;
  
  setFolders: (folders: FolderNode[]) => void;
  setTags: (tags: TagInfo[]) => void;
  
  // 필터링
  setFilter: (type: 'all' | 'favorites' | 'folder' | 'tag', value?: string) => void;
  getFilteredPrompts: () => PromptFileInfo[];
  
  // 정렬
  setSortOptions: (sortBy: SortBy, sortOrder: SortOrder) => void;
  
  // 즐겨찾기
  toggleFavorite: (promptId: string) => void;
  
  // 로딩 상태
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 데이터 새로고침
  refreshData: () => Promise<void>;
}

// Zustand 스토어 생성
export const usePromptStore = create<PromptStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      prompts: [],
      selectedPrompt: null,
      folders: [],
      favorites: [],
      tags: [],
      
      currentFilter: { type: 'all' },
      sortBy: 'modified',
      sortOrder: 'desc',
      
      isLoading: false,
      error: null,
      
      // 액션 구현
      setPrompts: (prompts) => {
        const favorites = prompts.filter(p => p.metadata.favorite);
        set({ prompts, favorites });
      },
      
      addPrompt: (prompt) => {
        set(state => {
          const newPrompts = [...state.prompts, prompt];
          const newFavorites = prompt.metadata.favorite 
            ? [...state.favorites, prompt]
            : state.favorites;
          
          return {
            prompts: newPrompts,
            favorites: newFavorites
          };
        });
      },
      
      updatePrompt: (id, updates) => {
        set(state => {
          const updatedPrompts = state.prompts.map(p => 
            p.id === id ? { ...p, ...updates } : p
          );
          
          const updatedFavorites = updatedPrompts.filter(p => p.metadata.favorite);
          
          return {
            prompts: updatedPrompts,
            favorites: updatedFavorites
          };
        });
      },
      
      removePrompt: (id) => {
        set(state => ({
          prompts: state.prompts.filter(p => p.id !== id),
          favorites: state.favorites.filter(p => p.id !== id),
          selectedPrompt: state.selectedPrompt?.id === id ? null : state.selectedPrompt
        }));
      },
      
      selectPrompt: (prompt) => {
        set({ selectedPrompt: prompt });
      },
      
      setFolders: (folders) => {
        set({ folders });
      },
      
      setTags: (tags) => {
        set({ tags });
      },
      
      setFilter: (type, value) => {
        set({ currentFilter: { type, value } });
      },
      
      getFilteredPrompts: () => {
        const state = get();
        let filtered = [...state.prompts];
        
        // 필터 적용
        switch (state.currentFilter.type) {
          case 'favorites':
            filtered = filtered.filter(p => p.metadata.favorite);
            break;
          case 'folder':
            if (state.currentFilter.value) {
              filtered = filtered.filter(p => 
                p.path.startsWith(state.currentFilter.value!)
              );
            }
            break;
          case 'tag':
            if (state.currentFilter.value) {
              filtered = filtered.filter(p => 
                p.metadata.tags.includes(state.currentFilter.value!)
              );
            }
            break;
          default:
            // 'all' - 필터링 없음
            break;
        }
        
        // 정렬 적용
        filtered.sort((a, b) => {
          let comparison = 0;
          
          switch (state.sortBy) {
            case 'name':
              comparison = a.metadata.title.localeCompare(b.metadata.title);
              break;
            case 'modified':
              comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
              break;
            case 'created':
              comparison = new Date(a.metadata.created_at).getTime() - new Date(b.metadata.created_at).getTime();
              break;
          }
          
          return state.sortOrder === 'desc' ? -comparison : comparison;
        });
        
        return filtered;
      },
      
      setSortOptions: (sortBy, sortOrder) => {
        set({ sortBy, sortOrder });
      },
      
      toggleFavorite: (promptId) => {
        set(state => {
          const updatedPrompts = state.prompts.map(p => 
            p.id === promptId 
              ? { ...p, metadata: { ...p.metadata, favorite: !p.metadata.favorite } }
              : p
          );
          
          const updatedFavorites = updatedPrompts.filter(p => p.metadata.favorite);
          
          return {
            prompts: updatedPrompts,
            favorites: updatedFavorites
          };
        });
      },
      
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
      
      setError: (error) => {
        set({ error });
      },
      
      refreshData: async () => {
        const state = get();
        state.setLoading(true);
        state.setError(null);
        
        try {
          // IPC를 통해 데이터 새로고침
          const response = await window.electronAPI.invoke('file:list', {
            includeContent: false,
            sortBy: state.sortBy,
            sortOrder: state.sortOrder
          });
          
          if (response.success) {
            state.setPrompts(response.data);
          } else {
            state.setError(response.error?.message || 'Failed to load prompts');
          }
        } catch (error) {
          state.setError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
          state.setLoading(false);
        }
      }
    }),
    {
      name: 'promptory-prompt-store',
      partialize: (state) => ({
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        currentFilter: state.currentFilter
      })
    }
  )
);

