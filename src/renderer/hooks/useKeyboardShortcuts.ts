/**
 * 전역 키보드 단축키 관리 훅
 */

import { useEffect } from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import { toast } from '@renderer/components/common/ToastContainer';

interface KeyboardShortcutsOptions {
  enableGlobalShortcuts?: boolean;
  enableEditorShortcuts?: boolean;
}

export const useKeyboardShortcuts = (options: KeyboardShortcutsOptions = {}) => {
  const { 
    editingPromptId, 
    setEditingPrompt, 
    hasUnsavedChanges,
    showConfirmDialog,
    hideConfirmDialog,
    settings
  } = useAppStore();
  
  const { 
    selectedPrompt, 
    selectPrompt, 
    refreshData,
    updatePrompt 
  } = usePromptStore();

  const {
    enableGlobalShortcuts = true,
    enableEditorShortcuts = true
  } = options;
  
  // 단축키 설정 가져오기
  const shortcuts = settings.shortcuts || {
    newPrompt: 'CmdOrCtrl+N',
    search: 'CmdOrCtrl+F',
    toggleFavorite: 'CmdOrCtrl+D',
    usePrompt: 'CmdOrCtrl+U',
    editPrompt: 'CmdOrCtrl+E',
    copyContent: 'CmdOrCtrl+Shift+C',
    showHelp: 'CmdOrCtrl+/',
    exitEdit: 'Escape',
    refresh: 'CmdOrCtrl+R'
  };
  
  // 단축키 문자열을 파싱하는 헬퍼 함수
  const matchesShortcut = (e: KeyboardEvent, shortcut: string): boolean => {
    const parts = shortcut.split('+');
    const hasCmdOrCtrl = parts.includes('CmdOrCtrl') || parts.includes('Cmd') || parts.includes('Ctrl');
    const hasShift = parts.includes('Shift');
    const hasAlt = parts.includes('Alt');
    const key = parts[parts.length - 1].toLowerCase();
    
    const cmdMatch = hasCmdOrCtrl ? (e.metaKey || e.ctrlKey) : !e.metaKey && !e.ctrlKey;
    const shiftMatch = hasShift ? e.shiftKey : !e.shiftKey;
    const altMatch = hasAlt ? e.altKey : !e.altKey;
    const keyMatch = e.key.toLowerCase() === key || e.code.toLowerCase() === key.toLowerCase();
    
    return cmdMatch && shiftMatch && altMatch && keyMatch;
  };

  useEffect(() => {
    if (!enableGlobalShortcuts) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                            document.activeElement?.tagName === 'TEXTAREA' ||
                            (document.activeElement as HTMLElement)?.contentEditable === 'true';

      // 입력 필드에 포커스가 있을 때는 일부 단축키만 허용
      if (isInputFocused) {
        // Cmd+S는 항상 허용 (저장)
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
          // 에디터에서 처리하도록 이벤트를 전파
          return;
        }
        
        // ESC는 항상 허용 (포커스 해제)
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement)?.blur();
          return;
        }
        
        // 다른 단축키는 입력 중일 때 무시
        return;
      }

      // 단축키 매칭 (설정값 사용)
      if (matchesShortcut(e, shortcuts.newPrompt)) {
        e.preventDefault();
        handleNewPrompt();
      } else if (matchesShortcut(e, shortcuts.search)) {
        e.preventDefault();
        handleFocusSearch();
      } else if (matchesShortcut(e, shortcuts.refresh)) {
        e.preventDefault();
        handleRefresh();
      } else if (matchesShortcut(e, shortcuts.toggleFavorite)) {
        if (selectedPrompt && !editingPromptId) {
          e.preventDefault();
          handleToggleFavorite();
        }
      } else if (matchesShortcut(e, shortcuts.usePrompt)) {
        if (selectedPrompt && !editingPromptId) {
          e.preventDefault();
          handleUsePrompt();
        }
      } else if (matchesShortcut(e, shortcuts.editPrompt)) {
        if (selectedPrompt && !editingPromptId) {
          e.preventDefault();
          handleEditPrompt();
        }
      } else if (matchesShortcut(e, shortcuts.copyContent)) {
        if (selectedPrompt && !editingPromptId) {
          e.preventDefault();
          handleCopyPrompt();
        }
      } else if (matchesShortcut(e, shortcuts.showHelp)) {
        e.preventDefault();
        showShortcutHelp();
      } else if (matchesShortcut(e, shortcuts.exitEdit)) {
        handleEscape();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [enableGlobalShortcuts, shortcuts, selectedPrompt, editingPromptId, hasUnsavedChanges]);

  // 새 프롬프트 생성
  const handleNewPrompt = () => {
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
          selectPrompt(null);
          setEditingPrompt('new-prompt');
        },
        () => {
          // 취소 버튼 클릭 (다이얼로그만 닫기)
          hideConfirmDialog();
        }
      );
    } else {
      selectPrompt(null);
      setEditingPrompt('new-prompt');
      // 키보드 단축키 토스트 제거
    }
  };

  // 검색 포커스
  const handleFocusSearch = () => {
    const searchInput = document.querySelector('input[placeholder*="검색"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
      // 키보드 단축키 토스트 제거
    }
  };

  // 새로고침
  const handleRefresh = () => {
    refreshData();
    // 키보드 단축키 토스트 제거
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = () => {
    if (!selectedPrompt) return;

    const newFavoriteStatus = !selectedPrompt.metadata.favorite;
    updatePrompt(selectedPrompt.id, {
      metadata: {
        ...selectedPrompt.metadata,
        favorite: newFavoriteStatus
      }
    });

    // 서버에 업데이트 (실제 구현에서는 IPC 호출)
    window.electronAPI.invoke('file:update', selectedPrompt.path, {
      metadata: {
        ...selectedPrompt.metadata,
        favorite: newFavoriteStatus
      }
    });

    // 키보드 단축키 토스트 제거
  };

  // 프롬프트 사용
  const handleUsePrompt = () => {
    if (!selectedPrompt) return;
    
    // ParameterInputModal 열기 이벤트 발생
    window.dispatchEvent(new CustomEvent('open-parameter-modal', {
      detail: { prompt: selectedPrompt }
    }));
    
    // 키보드 단축키 토스트 제거
  };

  // 프롬프트 편집
  const handleEditPrompt = () => {
    if (!selectedPrompt) return;
    
    setEditingPrompt(selectedPrompt.id);
    // 키보드 단축키 토스트 제거
  };

  // 프롬프트 복사
  const handleCopyPrompt = () => {
    if (!selectedPrompt) return;
    
    navigator.clipboard.writeText(selectedPrompt.content);
    toast.success('프롬프트가 클립보드에 복사되었습니다.');
  };

  // 설정 열기
  const handleOpenSettings = () => {
    const { showSettingsModal } = useAppStore.getState();
    showSettingsModal();
  };

  // ESC 키 처리
  const handleEscape = () => {
    const { settingsModal, hideSettingsModal } = useAppStore.getState();
    
    // 설정창이 열려있으면 닫기
    if (settingsModal.isOpen) {
      hideSettingsModal();
      return;
    }
    
    if (editingPromptId) {
      if (hasUnsavedChanges) {
        showConfirmDialog(
          '편집 취소',
          '저장하지 않은 변경사항이 있습니다. 편집을 취소하시겠습니까?',
          () => {
            // 저장 후 편집 모드 종료
            window.dispatchEvent(new CustomEvent('save-and-exit-edit'));
          },
          () => {
            // 저장하지 않고 편집 모드 종료
            setEditingPrompt(null);
            // 키보드 단축키 토스트 제거
          },
          () => {
            // 취소 버튼 클릭 (다이얼로그만 닫기)
            hideConfirmDialog();
          }
        );
      } else {
        setEditingPrompt(null);
        // 키보드 단축키 토스트 제거
      }
    }
  };

  // 방향키 네비게이션
  const handleArrowNavigation = (direction: 'up' | 'down') => {
    const { prompts, getFilteredPrompts } = usePromptStore.getState();
    const filteredPrompts = getFilteredPrompts();
    
    if (filteredPrompts.length === 0) return;

    const currentIndex = selectedPrompt 
      ? filteredPrompts.findIndex(p => p.id === selectedPrompt.id)
      : -1;

    let nextIndex: number;
    if (direction === 'up') {
      nextIndex = currentIndex <= 0 ? filteredPrompts.length - 1 : currentIndex - 1;
    } else {
      nextIndex = currentIndex >= filteredPrompts.length - 1 ? 0 : currentIndex + 1;
    }

    const nextPrompt = filteredPrompts[nextIndex];
    if (nextPrompt) {
      // 프롬프트 선택 (실제 내용 로드)
      window.electronAPI.invoke('file:read', nextPrompt.path).then((response: any) => {
        if (response.success) {
          selectPrompt(response.data);
        }
      });
    }
  };

  // 단축키 도움말 표시
  const showShortcutHelp = () => {
    const shortcuts = [
      'Cmd+N: 새 프롬프트',
      'Cmd+F: 검색',
      'Cmd+R: 새로고침',
      'Cmd+D: 즐겨찾기 토글',
      'Cmd+U: 프롬프트 사용',
      'Cmd+E: 편집',
      'Cmd+Shift+C: 복사',
      'Cmd+S: 저장 (편집 중)',
      'ESC: 취소/종료',
      '↑/↓: 프롬프트 네비게이션'
    ];

    // 도움말 토스트는 유지 (사용자가 요청한 정보)
    toast.info(`키보드 단축키:\n${shortcuts.join('\n')}`, { duration: 5000 });
  };

  return {
    showShortcutHelp
  };
};
