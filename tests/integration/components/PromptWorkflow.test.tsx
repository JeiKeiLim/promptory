/**
 * 프롬프트 워크플로우 통합 테스트 (간소화 버전)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import type { PromptFile, PromptMetadata } from '@shared/types/prompt';

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

describe('Prompt Workflow Integration (Simplified)', () => {
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

  describe('New Prompt Creation Workflow', () => {
    it('should handle new prompt creation state transitions', () => {
      const appStore = useAppStore.getState();
      const promptStore = usePromptStore.getState();

      // 1. 새 프롬프트 생성 모드 진입
      appStore.setEditingPrompt('new-prompt');
      expect(useAppStore.getState().editingPromptId).toBe('new-prompt');

      // 2. 변경사항 플래그 설정
      appStore.setUnsavedChanges(true);
      expect(useAppStore.getState().hasUnsavedChanges).toBe(true);

      // 3. 편집 완료 후 상태 초기화
      appStore.setEditingPrompt(null);
      appStore.setUnsavedChanges(false);
      
      expect(useAppStore.getState().editingPromptId).toBeNull();
      expect(useAppStore.getState().hasUnsavedChanges).toBe(false);
    });

    it('should validate new prompt creation data', () => {
      const metadata: PromptMetadata = {
        title: 'Test New Prompt',
        description: 'A test prompt for creation workflow',
        tags: ['test', 'new'],
        favorite: false,
        created_at: new Date().toISOString(),
        parameters: []
      };

      // 메타데이터 검증
      expect(metadata.title).toBeTruthy();
      expect(metadata.tags).toHaveLength(2);
      expect(metadata.parameters).toEqual([]);
    });
  });

  describe('Prompt Selection and Editing Workflow', () => {
    it('should handle prompt selection and editing state', () => {
      const mockPrompt: PromptFile = {
        id: 'test-prompt',
        path: 'test-prompt.md',
        metadata: {
          title: 'Test Prompt',
          description: 'A test prompt',
          tags: ['test'],
          favorite: false,
          created_at: new Date().toISOString(),
          parameters: []
        },
        content: 'Test content',
        modifiedAt: new Date().toISOString(),
        fileSize: 256
      };

      // 1. 프롬프트 선택
      usePromptStore.getState().selectPrompt(mockPrompt);
      expect(usePromptStore.getState().selectedPrompt).toBe(mockPrompt);

      // 2. 편집 모드 진입
      useAppStore.getState().setEditingPrompt('test-prompt');
      expect(useAppStore.getState().editingPromptId).toBe('test-prompt');

      // 3. 편집 모드 확인 (editTab 기능 제거됨)
      // 편집 모드가 활성화되었는지만 확인
      expect(useAppStore.getState().editingPromptId).toBeTruthy();
    });
  });

  describe('Unsaved Changes Workflow', () => {
    it('should handle unsaved changes confirmation dialog', () => {
      const appStore = useAppStore.getState();

      // 1. 편집 모드에서 변경사항 생성
      appStore.setEditingPrompt('test-prompt');
      appStore.setUnsavedChanges(true);

      // 2. 확인 다이얼로그 표시
      const mockSaveHandler = vi.fn();
      const mockDontSaveHandler = vi.fn();

      appStore.showConfirmDialog(
        '변경사항 저장',
        '저장하지 않은 변경사항이 있습니다.',
        mockSaveHandler,
        mockDontSaveHandler
      );

      const dialog = useAppStore.getState().confirmDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.title).toBe('변경사항 저장');
      expect(dialog.onSave).toBe(mockSaveHandler);
      expect(dialog.onDontSave).toBe(mockDontSaveHandler);

      // 3. 다이얼로그 닫기
      appStore.hideConfirmDialog();
      expect(useAppStore.getState().confirmDialog.isOpen).toBe(false);
    });
  });

  describe('Filter and Search Workflow', () => {
    it('should handle filtering workflow', () => {
      const mockPrompts = [
        {
          id: 'prompt1',
          path: 'folder1/prompt1.md',
          metadata: {
            title: 'Prompt 1',
            tags: ['tag1', 'common'],
            favorite: true,
            created_at: new Date().toISOString(),
            parameters: []
          },
          modifiedAt: new Date().toISOString(),
          fileSize: 256
        },
        {
          id: 'prompt2',
          path: 'folder2/prompt2.md',
          metadata: {
            title: 'Prompt 2',
            tags: ['tag2', 'common'],
            favorite: false,
            created_at: new Date().toISOString(),
            parameters: []
          },
          modifiedAt: new Date().toISOString(),
          fileSize: 512
        }
      ];

      // 프롬프트 목록 설정
      usePromptStore.setState({
        prompts: mockPrompts,
        favorites: mockPrompts.filter(p => p.metadata.favorite),
        tags: ['common', 'tag1', 'tag2']
      });

      const store = usePromptStore.getState();

      // 1. 전체 보기
      store.setFilter('all');
      let filtered = store.getFilteredPrompts();
      expect(filtered).toHaveLength(2);

      // 2. 즐겨찾기 필터
      store.setFilter('favorites');
      filtered = store.getFilteredPrompts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].metadata.favorite).toBe(true);

      // 3. 태그 필터
      store.setFilter('tag', 'tag1');
      filtered = store.getFilteredPrompts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].metadata.tags).toContain('tag1');
    });
  });

  describe('Parameter System Workflow', () => {
    it('should handle parameterized prompts', () => {
      const parameterizedPrompt: PromptFile = {
        id: 'param-prompt',
        path: 'param-prompt.md',
        metadata: {
          title: 'Parameterized Prompt',
          description: 'A prompt with parameters',
          tags: ['params'],
          favorite: false,
          created_at: new Date().toISOString(),
          parameters: [
            {
              name: 'language',
              type: 'category',
              required: true,
              description: 'Programming language',
              options: ['Python', 'JavaScript', 'TypeScript']
            },
            {
              name: 'task',
              type: 'string',
              required: true,
              description: 'Task description'
            }
          ]
        },
        content: 'Write {{language}} code for: {{task}}',
        modifiedAt: new Date().toISOString(),
        fileSize: 256
      };

      // 파라미터가 있는 프롬프트 선택
      usePromptStore.getState().selectPrompt(parameterizedPrompt);
      const selectedPrompt = usePromptStore.getState().selectedPrompt;

      expect(selectedPrompt?.metadata.parameters).toHaveLength(2);
      expect(selectedPrompt?.metadata.parameters[0].name).toBe('language');
      expect(selectedPrompt?.metadata.parameters[0].type).toBe('category');
      expect(selectedPrompt?.metadata.parameters[0].options).toEqual(['Python', 'JavaScript', 'TypeScript']);
      expect(selectedPrompt?.metadata.parameters[1].name).toBe('task');
      expect(selectedPrompt?.metadata.parameters[1].type).toBe('string');

      // 파라미터 치환 시뮬레이션
      const parameterValues = {
        language: 'Python',
        task: 'Create a web scraper'
      };

      let renderedContent = selectedPrompt?.content || '';
      Object.entries(parameterValues).forEach(([key, value]) => {
        renderedContent = renderedContent.replace(
          new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),
          value
        );
      });

      expect(renderedContent).toBe('Write Python code for: Create a web scraper');
    });
  });

  describe('Context Menu Workflow', () => {
    it('should handle context menu state', () => {
      const appStore = useAppStore.getState();

      // 컨텍스트 메뉴 표시
      appStore.showContextMenu({ x: 100, y: 200 }, 'test-prompt');

      const contextMenu = useAppStore.getState().contextMenu;
      expect(contextMenu.isOpen).toBe(true);
      expect(contextMenu.position).toEqual({ x: 100, y: 200 });
      expect(contextMenu.promptId).toBe('test-prompt');

      // 컨텍스트 메뉴 숨기기
      appStore.hideContextMenu();
      expect(useAppStore.getState().contextMenu.isOpen).toBe(false);
    });
  });
});