/**
 * 앱 전역 상태 관리 (Zustand)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// UI 상태 타입
export interface AppSettings {
  // 일반 설정
  language: 'ko' | 'en' | 'ja';
  autoCloseModal: boolean;
  projectPath: string; // 프롬프트 저장 위치
  
  // 에디터 설정
  editor: {
    wordWrap: boolean;
    showLineNumbers: boolean;
  };
  
  // 검색 설정
  search: {
    maxResults: number;
    highlightMatches: boolean;
    searchScope: {
      title: boolean;
      tags: boolean;
      content: boolean;
    };
  };
  
  // 윈도우 설정
  window: {
    rememberSize: boolean;
    startMaximized: boolean;
  };
  
  // 키보드 단축키
  shortcuts: {
    newPrompt: string;
    search: string;
    toggleFavorite: string;
    usePrompt: string;
    editPrompt: string;
    copyContent: string;
    showHelp: string;
    exitEdit: string;
    refresh: string;
  };
}

export interface CollapsedSections {
  favorites: boolean;
  folders: boolean;
  tags: boolean;
}

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  promptId: string | null;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onSave: (() => void) | null;
  onDontSave: (() => void) | null;
  onCancel: (() => void) | null;
  saveButtonText?: string;
  dontSaveButtonText?: string;
  cancelButtonText?: string;
}

// 앱 스토어 인터페이스
export interface AppStore {
  // UI 상태
  collapsedSections: CollapsedSections;
  sidebarWidth: number;
  mainContentWidth: number;
  
  // 편집 상태
  editingPromptId: string | null;
  hasUnsavedChanges: boolean;
  
  // 모달 및 다이얼로그 상태
  contextMenu: ContextMenuState;
  confirmDialog: ConfirmDialogState;
  
  // 설정창
  settingsModal: {
    isOpen: boolean;
    activeTab: 'general' | 'editor' | 'search' | 'shortcuts' | 'window' | 'llm';
  };
  
  // 설정
  settings: AppSettings;
  
  // 액션
  toggleSection: (section: keyof CollapsedSections) => void;
  setSidebarWidth: (width: number) => void;
  setMainContentWidth: (width: number) => void;
  
  // 편집 상태 관리
  setEditingPrompt: (promptId: string | null) => void;
  setUnsavedChanges: (hasChanges: boolean) => void;
  
  // 컨텍스트 메뉴 관리
  showContextMenu: (position: { x: number; y: number }, promptId: string) => void;
  hideContextMenu: () => void;
  
  // 확인 다이얼로그 관리
  showConfirmDialog: (
    title: string,
    message: string,
    onSave: () => void,
    onDontSave: () => void,
    onCancel: () => void,
    options?: {
      saveButtonText?: string;
      dontSaveButtonText?: string;
      cancelButtonText?: string;
    }
  ) => void;
  hideConfirmDialog: () => void;
  
  // 설정창 관리
  showSettingsModal: (tab?: 'general' | 'editor' | 'search' | 'shortcuts' | 'window' | 'llm') => void;
  hideSettingsModal: () => void;
  setSettingsTab: (tab: 'general' | 'editor' | 'search' | 'shortcuts' | 'window' | 'llm') => void;
  
  // 설정 관리
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

// 기본값
const defaultSettings: AppSettings = {
  language: 'ko',
  autoCloseModal: true,
  projectPath: '', // 빈 문자열이면 기본 경로 사용
  
  editor: {
    wordWrap: true,
    showLineNumbers: false
  },
  
  search: {
    maxResults: 100,
    highlightMatches: true,
    searchScope: {
      title: true,
      tags: true,
      content: true
    }
  },
  
  window: {
    rememberSize: true,
    startMaximized: false
  },
  
  shortcuts: {
    newPrompt: 'CmdOrCtrl+N',
    search: 'CmdOrCtrl+F',
    toggleFavorite: 'CmdOrCtrl+D',
    usePrompt: 'CmdOrCtrl+U',
    editPrompt: 'CmdOrCtrl+E',
    copyContent: 'CmdOrCtrl+Shift+C',
    showHelp: 'CmdOrCtrl+/',
    exitEdit: 'Escape',
    refresh: 'CmdOrCtrl+R'
  }
};

const defaultCollapsedSections: CollapsedSections = {
  favorites: false,
  folders: false,
  tags: false
};

// Zustand 스토어 생성
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      collapsedSections: defaultCollapsedSections,
      sidebarWidth: 250,
      mainContentWidth: 400,
      
      editingPromptId: null,
      hasUnsavedChanges: false,
      
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
        onDontSave: null,
        onCancel: null
      },
      
      settingsModal: {
        isOpen: false,
        activeTab: 'general'
      },
      
      settings: defaultSettings,
      
      // 액션 구현
      toggleSection: (section) => {
        set(state => ({
          collapsedSections: {
            ...state.collapsedSections,
            [section]: !state.collapsedSections[section]
          }
        }));
      },
      
      setSidebarWidth: (width) => {
        set({ sidebarWidth: Math.max(200, Math.min(400, width)) });
      },
      
      setMainContentWidth: (width) => {
        set({ mainContentWidth: Math.max(300, Math.min(600, width)) });
      },
      
      setEditingPrompt: (promptId) => {
        set({ editingPromptId: promptId });
      },
      
      setUnsavedChanges: (hasChanges) => {
        set({ hasUnsavedChanges: hasChanges });
      },
      
      showContextMenu: (position, promptId) => {
        set({
          contextMenu: {
            isOpen: true,
            position,
            promptId
          }
        });
      },
      
      hideContextMenu: () => {
        set({
          contextMenu: {
            isOpen: false,
            position: { x: 0, y: 0 },
            promptId: null
          }
        });
      },
      
      showConfirmDialog: (title, message, onSave, onDontSave, onCancel, options) => {
        set({
          confirmDialog: {
            isOpen: true,
            title,
            message,
            onSave,
            onDontSave,
            onCancel,
            saveButtonText: options?.saveButtonText,
            dontSaveButtonText: options?.dontSaveButtonText,
            cancelButtonText: options?.cancelButtonText
          }
        });
      },
      
      hideConfirmDialog: () => {
        set({
      confirmDialog: {
        isOpen: false,
        title: '',
        message: '',
        onSave: null,
        onDontSave: null,
        onCancel: null,
            saveButtonText: undefined,
            dontSaveButtonText: undefined,
            cancelButtonText: undefined
          }
        });
      },
      
      showSettingsModal: (tab = 'general') => {
        set({
          settingsModal: {
            isOpen: true,
            activeTab: tab
          }
        });
      },
      
      hideSettingsModal: () => {
        set({
          settingsModal: {
            isOpen: false,
            activeTab: 'general'
          }
        });
      },
      
      setSettingsTab: (tab) => {
        set(state => ({
          settingsModal: {
            ...state.settingsModal,
            activeTab: tab
          }
        }));
      },
      
      updateSettings: (newSettings) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings }
        }));
      },
      
      resetSettings: () => {
        set({ settings: defaultSettings });
      }
    }),
    {
      name: 'promptory-app-store',
      partialize: (state) => ({
        collapsedSections: state.collapsedSections,
        sidebarWidth: state.sidebarWidth,
        mainContentWidth: state.mainContentWidth,
        settings: state.settings
      })
    }
  )
);

