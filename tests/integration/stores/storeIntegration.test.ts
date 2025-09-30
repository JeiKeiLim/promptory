/**
 * 스토어 통합 테스트 (간소화 버전)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import type { PromptFileInfo, PromptFile } from '@shared/types/prompt';

// Electron API 모킹
const mockElectronAPI = {
  invoke: vi.fn(),
  on: vi.fn(() => () => {}),
  removeAllListeners: vi.fn()
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

describe('Store Integration Tests (Simplified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 스토어 초기화
    usePromptStore.setState({
      prompts: [],
      favorites: [],
      tags: [],
      selectedPrompt: null,
      isLoading: false,
      error: null,
      currentFilter: { type: 'all' },
      searchTerm: ''
    });

    useAppStore.setState({
      editingPromptId: null,
      hasUnsavedChanges: false,
      editTab: 'edit',
      contextMenu: {
        isOpen: false,
        position: { x: 0, y: 0 },
        promptId: null
      },
      confirmDialog: {
        isOpen: false,
        title: '',
        message: '',
        onSave: null,
        onDontSave: null
      }
    });
  });

  describe('PromptStore and AppStore Integration', () => {
    it('should coordinate prompt selection with editing state', () => {
      const mockPrompts: PromptFileInfo[] = [
        {
          id: 'prompt1',
          path: 'test1.md',
          metadata: {
            title: 'Test Prompt 1',
            description: 'First test prompt',
            tags: ['test', 'example'],
            favorite: true,
            created_at: new Date().toISOString(),
            parameters: []
          },
          modifiedAt: new Date().toISOString(),
          fileSize: 256
        },
        {
          id: 'prompt2',
          path: 'test2.md',
          metadata: {
            title: 'Test Prompt 2',
            description: 'Second test prompt',
            tags: ['test', 'example'],
            favorite: false,
            created_at: new Date().toISOString(),
            parameters: []
          },
          modifiedAt: new Date().toISOString(),
          fileSize: 512
        }
      ];

      // 1. 프롬프트 목록 설정
      usePromptStore.setState({
        prompts: mockPrompts,
        favorites: mockPrompts.filter(p => p.metadata.favorite),
        tags: ['example', 'test']
      });

      expect(usePromptStore.getState().prompts).toHaveLength(2);
      expect(usePromptStore.getState().favorites).toHaveLength(1);
      expect(usePromptStore.getState().tags.sort()).toEqual(['example', 'test']);

      // 2. 프롬프트 선택
      const fullPrompt: PromptFile = {
        ...mockPrompts[0],
        content: 'Test content',
      };

      usePromptStore.getState().selectPrompt(fullPrompt);
      expect(usePromptStore.getState().selectedPrompt).toBe(fullPrompt);

      // 3. 편집 모드 진입
      useAppStore.getState().setEditingPrompt('prompt1');
      expect(useAppStore.getState().editingPromptId).toBe('prompt1');

      // 4. 변경사항 플래그 설정
      useAppStore.getState().setUnsavedChanges(true);
      expect(useAppStore.getState().hasUnsavedChanges).toBe(true);

      // 5. 편집 완료
      useAppStore.getState().setEditingPrompt(null);
      useAppStore.getState().setUnsavedChanges(false);
      
      expect(useAppStore.getState().editingPromptId).toBeNull();
      expect(useAppStore.getState().hasUnsavedChanges).toBe(false);
    });

    it('should handle filtering and search coordination', () => {
      const mockPrompts: PromptFileInfo[] = [
        {
          id: 'js-prompt',
          path: 'javascript/react-component.md',
          metadata: {
            title: 'React Component Generator',
            description: 'Generate React components',
            tags: ['javascript', 'react', 'frontend'],
            favorite: true,
            created_at: new Date().toISOString(),
            parameters: []
          },
          modifiedAt: new Date().toISOString(),
          fileSize: 1024
        },
        {
          id: 'py-prompt',
          path: 'python/data-analysis.md',
          metadata: {
            title: 'Python Data Analysis',
            description: 'Analyze data with Python',
            tags: ['python', 'data', 'analysis'],
            favorite: false,
            created_at: new Date().toISOString(),
            parameters: []
          },
          modifiedAt: new Date().toISOString(),
          fileSize: 2048
        }
      ];

      usePromptStore.setState({ 
        prompts: mockPrompts,
        favorites: mockPrompts.filter(p => p.metadata.favorite),
        tags: ['analysis', 'data', 'frontend', 'javascript', 'python', 'react']
      });

      const store = usePromptStore.getState();

      // 전체 보기
      store.setFilter('all');
      let filtered = store.getFilteredPrompts();
      expect(filtered).toHaveLength(2);

      // 즐겨찾기 필터
      store.setFilter('favorites');
      filtered = store.getFilteredPrompts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].metadata.favorite).toBe(true);

      // 태그 필터
      store.setFilter('tag', 'javascript');
      filtered = store.getFilteredPrompts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].metadata.tags).toContain('javascript');

      // 폴더 필터
      store.setFilter('folder', 'python');
      filtered = store.getFilteredPrompts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].path).toContain('python');

      // 검색어 설정 (실제 구현에서는 SearchBar 컴포넌트에서 관리)
      usePromptStore.setState({ searchTerm: 'react' });
      expect(usePromptStore.getState().searchTerm).toBe('react');

      // 검색어 초기화
      usePromptStore.setState({ searchTerm: '' });
      expect(usePromptStore.getState().searchTerm).toBe('');
    });
  });

  describe('Context Menu Integration', () => {
    it('should handle context menu state with prompt selection', () => {
      const appStore = useAppStore.getState();

      // 컨텍스트 메뉴 표시
      appStore.showContextMenu({ x: 150, y: 250 }, 'test-prompt-id');

      const contextMenu = useAppStore.getState().contextMenu;
      expect(contextMenu.isOpen).toBe(true);
      expect(contextMenu.position).toEqual({ x: 150, y: 250 });
      expect(contextMenu.promptId).toBe('test-prompt-id');

      // 컨텍스트 메뉴 숨기기
      appStore.hideContextMenu();
      expect(useAppStore.getState().contextMenu.isOpen).toBe(false);
    });
  });

  describe('Confirm Dialog Integration', () => {
    it('should handle confirmation dialogs with store state', () => {
      const appStore = useAppStore.getState();

      // 편집 상태 설정
      appStore.setEditingPrompt('test-prompt');
      appStore.setUnsavedChanges(true);

      // 확인 다이얼로그 표시
      const mockSaveHandler = vi.fn();
      const mockDontSaveHandler = vi.fn();

      appStore.showConfirmDialog(
        '변경사항 저장',
        '저장하지 않은 변경사항이 있습니다. 저장하시겠습니까?',
        mockSaveHandler,
        mockDontSaveHandler
      );

      const dialog = useAppStore.getState().confirmDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.title).toBe('변경사항 저장');
      expect(dialog.message).toContain('저장하지 않은 변경사항');
      expect(dialog.onSave).toBe(mockSaveHandler);
      expect(dialog.onDontSave).toBe(mockDontSaveHandler);

      // 다이얼로그 닫기
      appStore.hideConfirmDialog();
      expect(useAppStore.getState().confirmDialog.isOpen).toBe(false);
    });
  });

  describe('Edit Tab Integration', () => {
    it('should handle edit mode state (editTab feature removed)', () => {
      const appStore = useAppStore.getState();

      // editTab 기능이 제거되었으므로 편집 모드 상태만 테스트
      expect(appStore.editingPromptId).toBeNull();

      // 편집 모드 진입
      appStore.setEditingPrompt('test-prompt');
      expect(useAppStore.getState().editingPromptId).toBe('test-prompt');

      // 편집 모드 종료
      appStore.setEditingPrompt(null);
      expect(useAppStore.getState().editingPromptId).toBeNull();
    });
  });

  describe('New Prompt Creation Integration', () => {
    it('should handle new prompt creation workflow', () => {
      const appStore = useAppStore.getState();
      const promptStore = usePromptStore.getState();

      // 새 프롬프트 생성 모드 진입
      appStore.setEditingPrompt('new-prompt');
      expect(useAppStore.getState().editingPromptId).toBe('new-prompt');

      // 선택된 프롬프트 초기화
      promptStore.selectPrompt(null);
      expect(usePromptStore.getState().selectedPrompt).toBeNull();

      // 변경사항 플래그 설정
      appStore.setUnsavedChanges(true);
      expect(useAppStore.getState().hasUnsavedChanges).toBe(true);

      // 새 프롬프트 생성 완료
      appStore.setEditingPrompt(null);
      appStore.setUnsavedChanges(false);
      
      expect(useAppStore.getState().editingPromptId).toBeNull();
      expect(useAppStore.getState().hasUnsavedChanges).toBe(false);
    });
  });

  describe('Performance Integration', () => {
    it('should handle large prompt lists efficiently', () => {
      const startTime = Date.now();

      // 1000개의 프롬프트 생성
      const largePromptList: PromptFileInfo[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `prompt-${i}`,
        path: `folder-${Math.floor(i / 100)}/prompt-${i}.md`,
        metadata: {
          title: `Prompt ${i}`,
          description: `Description for prompt ${i}`,
          tags: [`tag-${i % 10}`, 'common'],
          favorite: i % 5 === 0,
          created_at: new Date(Date.now() - i * 1000).toISOString(),
          parameters: []
        },
        modifiedAt: new Date(Date.now() - i * 1000).toISOString(),
        fileSize: 256 + (i % 1000)
      }));

      // 스토어에 설정
      usePromptStore.setState({
        prompts: largePromptList,
        favorites: largePromptList.filter(p => p.metadata.favorite),
        tags: Array.from(new Set(largePromptList.flatMap(p => p.metadata.tags))).sort()
      });

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);

      const state = usePromptStore.getState();
      expect(state.prompts).toHaveLength(1000);
      expect(state.favorites).toHaveLength(200); // 5로 나누어떨어지는 것들
      expect(state.tags.sort()).toContain('common');
    });
  });

  describe('Error State Integration', () => {
    it('should handle error states across stores', () => {
      const promptStore = usePromptStore.getState();

      // 로딩 상태 설정
      promptStore.setLoading(true);
      expect(usePromptStore.getState().isLoading).toBe(true);

      // 오류 상태 설정
      const testError = new Error('Test error');
      promptStore.setError(testError);
      expect(usePromptStore.getState().error).toBe(testError);
      // setError가 자동으로 loading을 false로 설정하지 않으므로 수동으로 설정
      promptStore.setLoading(false);
      expect(usePromptStore.getState().isLoading).toBe(false);

      // 오류 상태 초기화
      promptStore.setError(null);
      expect(usePromptStore.getState().error).toBeNull();
    });
  });
});