/**
 * Preload 스크립트 - Context Isolation을 통한 안전한 IPC 통신
 */

import { contextBridge, ipcRenderer } from 'electron';
import { ALLOWED_CHANNELS, ALLOWED_EVENTS } from '@shared/constants/ipcChannels';

// 허용된 채널 검증
function validateChannel(channel: string, allowedChannels: readonly string[]): boolean {
  return allowedChannels.includes(channel);
}

// Context Bridge를 통해 렌더러 프로세스에 안전한 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * IPC 요청-응답 통신
   * @param channel - IPC 채널명
   * @param args - 전달할 인자들
   * @returns Promise<any>
   */
  invoke: (channel: string, ...args: any[]) => {
    if (!validateChannel(channel, ALLOWED_CHANNELS)) {
      throw new Error(`Unauthorized IPC channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  /**
   * 이벤트 수신 등록
   * @param channel - 이벤트 채널명
   * @param callback - 콜백 함수
   */
  on: (channel: string, callback: (...args: any[]) => void) => {
    if (!validateChannel(channel, ALLOWED_EVENTS)) {
      throw new Error(`Unauthorized event channel: ${channel}`);
    }

    const subscription = (_event: Electron.IpcRendererEvent, ...args: any[]) => {
      callback(...args);
    };

    ipcRenderer.on(channel, subscription);

    // 구독 해제 함수 반환
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  /**
   * 이벤트 수신 해제
   * @param channel - 이벤트 채널명
   * @param callback - 콜백 함수
   */
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    if (!validateChannel(channel, ALLOWED_EVENTS)) {
      return;
    }
    ipcRenderer.removeListener(channel, callback);
  },

  /**
   * 모든 리스너 제거
   * @param channel - 이벤트 채널명
   */
  removeAllListeners: (channel: string) => {
    if (!validateChannel(channel, ALLOWED_EVENTS)) {
      return;
    }
    ipcRenderer.removeAllListeners(channel);
  },

  /**
   * 윈도우 제어 API
   */
  windowControl: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    center: () => ipcRenderer.invoke('window:center'),
    setSize: (width: number, height: number) =>
      ipcRenderer.invoke('window:set-size', width, height),
    getState: () => ipcRenderer.invoke('window:get-state'),
  },
});

// 타입 정의를 위한 전역 인터페이스 확장
declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
      removeListener: (channel: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
      windowControl: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        center: () => Promise<void>;
        setSize: (width: number, height: number) => Promise<void>;
        getState: () => Promise<any>;
      };
    };
  }
}
