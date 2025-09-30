/**
 * 메인 레이아웃 컴포넌트
 * 3패널 구조: 사이드바 | 프롬프트 목록 | 프롬프트 상세
 */

import React, { useEffect } from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import { Sidebar } from '../sidebar/Sidebar';
import { MainContent } from './MainContent';
import { PromptDetail } from '../prompt/PromptDetail';
import { Resizer } from '../common/Resizer';
import { ToastContainer } from '../common/ToastContainer';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PromptContextMenu } from '../prompt/PromptContextMenu';
import { SettingsModal } from '../settings/SettingsModal';
import { TitleBar } from './TitleBar';
import { useFileWatcher } from '@renderer/hooks/useFileWatcher';
import { useKeyboardShortcuts } from '@renderer/hooks/useKeyboardShortcuts';

export const Layout: React.FC = () => {
  const {
    sidebarWidth,
    mainContentWidth,
    setSidebarWidth,
    setMainContentWidth,
    contextMenu,
    confirmDialog
  } = useAppStore();

  const {
    selectedPrompt,
    refreshData,
    isLoading,
    error
  } = usePromptStore();

  const { editingPromptId } = useAppStore();

  // 파일 감시 훅 사용
  useFileWatcher();

  // 키보드 단축키 훅 사용
  const { showShortcutHelp } = useKeyboardShortcuts();
  

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 도움말 단축키 (Cmd+/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        showShortcutHelp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcutHelp]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* 커스텀 타이틀바 */}
      <TitleBar />
      
      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-1 overflow-hidden">
      {/* 좌측 사이드바 */}
      <div 
        data-testid="sidebar"
        className="flex-shrink-0 bg-white border-r border-gray-200"
        style={{ width: sidebarWidth }}
      >
        <Sidebar />
      </div>

      {/* 리사이저 */}
      <Resizer
        direction="horizontal"
        onResize={(delta) => setSidebarWidth(sidebarWidth + delta)}
        className="w-1 cursor-col-resize bg-gray-200 hover:bg-gray-300"
      />

      {/* 중앙 프롬프트 목록 */}
      <div 
        data-testid="main-content"
        className="flex-shrink-0 bg-white border-r border-gray-200"
        style={{ width: mainContentWidth }}
      >
        <MainContent />
      </div>

      {/* 리사이저 */}
      <Resizer
        direction="horizontal"
        onResize={(delta) => setMainContentWidth(mainContentWidth + delta)}
        className="w-1 cursor-col-resize bg-gray-200 hover:bg-gray-300"
      />

      {/* 우측 프롬프트 상세 */}
      <div 
        data-testid="prompt-detail" 
        className="flex-1 bg-white"
      >
        <PromptDetail prompt={selectedPrompt} />
      </div>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">로딩 중...</span>
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
            <button
              onClick={() => usePromptStore.getState().setError(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenu.isOpen && (
        <PromptContextMenu
          promptId={contextMenu.promptId!}
          position={contextMenu.position}
          onClose={() => useAppStore.getState().hideContextMenu()}
        />
      )}

      {/* 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onSave={confirmDialog.onSave || (() => {})}
        onDontSave={confirmDialog.onDontSave || (() => {})}
        onCancel={() => useAppStore.getState().hideConfirmDialog()}
        saveButtonText={confirmDialog.saveButtonText}
        dontSaveButtonText={confirmDialog.dontSaveButtonText}
        cancelButtonText={confirmDialog.cancelButtonText}
      />

      </div>

      {/* 설정 모달 */}
      <SettingsModal />

      {/* 토스트 알림 */}
      <ToastContainer />
    </div>
  );
};
