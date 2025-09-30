/**
 * 윈도우 제어 IPC 핸들러
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';

export function registerWindowHandlers(): void {
  // 윈도우 최소화
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.minimize();
    }
  });

  // 윈도우 최대화/복원
  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      if (focusedWindow.isMaximized()) {
        focusedWindow.unmaximize();
      } else {
        focusedWindow.maximize();
      }
    }
  });

  // 윈도우 닫기
  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.close();
    }
  });

  // 윈도우 중앙 정렬
  ipcMain.handle(IPC_CHANNELS.WINDOW_CENTER, async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.center();
    }
  });

  // 윈도우 크기 설정
  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_SIZE, async (_event, width: number, height: number) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.setSize(width, height);
      focusedWindow.center();
    }
  });

  // 윈도우 상태 조회
  ipcMain.handle(IPC_CHANNELS.WINDOW_GET_STATE, async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      const bounds = focusedWindow.getBounds();
      return {
        isMaximized: focusedWindow.isMaximized(),
        isMinimized: focusedWindow.isMinimized(),
        isFullScreen: focusedWindow.isFullScreen(),
        bounds
      };
    }
    return null;
  });
}
