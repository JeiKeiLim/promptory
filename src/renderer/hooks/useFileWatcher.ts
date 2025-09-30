/**
 * 파일 감시 이벤트 처리 훅
 */

import { useEffect, useCallback } from 'react';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import { toast } from '@renderer/components/common/ToastContainer';

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  relativePath: string;
  timestamp: string;
}

export function useFileWatcher() {
  const { refreshData, selectedPrompt, selectPrompt } = usePromptStore();

  // 파일 변경 이벤트 처리
  const handleFileChange = useCallback(async (event: FileChangeEvent) => {
    console.log('File change detected:', event);

    try {
      switch (event.type) {
        case 'add':
          // 새 파일 추가됨
          // 새 파일 추가 토스트 제거 (자동 새로고침으로 충분)
          await refreshData();
          break;

        case 'change':
          // 파일 수정됨
          // 외부 수정 토스트 제거 (자동 업데이트로 충분)
          
          // 현재 선택된 프롬프트가 수정된 파일인지 확인
          if (selectedPrompt && selectedPrompt.path === event.relativePath) {
            // 현재 선택된 프롬프트를 다시 로드
            try {
              const response = await window.electronAPI.invoke('file:read', event.relativePath);
              if (response.success) {
                selectPrompt(response.data);
                // 자동 업데이트 성공 토스트 제거 (사용자가 인지할 필요 없음)
              }
            } catch (error) {
              console.error('Failed to reload current prompt:', error);
              toast.error('프롬프트 자동 업데이트에 실패했습니다.');
            }
          }
          
          // 전체 목록 새로고침
          await refreshData();
          break;

        case 'unlink':
          // 파일 삭제됨
          toast.warning(`프롬프트가 삭제되었습니다: ${event.relativePath}`);
          
          // 현재 선택된 프롬프트가 삭제된 파일인지 확인
          if (selectedPrompt && selectedPrompt.path === event.relativePath) {
            selectPrompt(null);
            // 선택 해제 토스트 제거 (자연스러운 동작)
          }
          
          await refreshData();
          break;

        case 'addDir':
          // 새 폴더 추가됨
          console.log('New directory added:', event.relativePath);
          await refreshData();
          break;

        case 'unlinkDir':
          // 폴더 삭제됨
          // 폴더 삭제 토스트 제거 (자동 새로고침으로 충분)
          await refreshData();
          break;

        default:
          console.log('Unknown file event type:', event.type);
      }
    } catch (error) {
      console.error('Error handling file change:', error);
      toast.error('파일 변경 처리 중 오류가 발생했습니다.');
    }
  }, [refreshData, selectedPrompt, selectPrompt]);

  // 파일 감시 이벤트 리스너 등록
  useEffect(() => {
    if (!window.electronAPI || typeof window.electronAPI.on !== 'function') {
      console.warn('electronAPI.on is not available');
      return;
    }

    // 파일 변경 이벤트 리스너 등록
    const removeListener = window.electronAPI.on(IPC_CHANNELS.FILE_CHANGED, handleFileChange);

    console.log('File watcher event listener registered');

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      if (removeListener && typeof removeListener === 'function') {
        removeListener();
      }
    };
  }, [handleFileChange]);

  return {
    // 필요시 추가 기능 노출
    handleFileChange,
  };
}

