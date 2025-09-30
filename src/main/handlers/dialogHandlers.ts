/**
 * 다이얼로그 관련 IPC 핸들러
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import type { IpcResponse } from '@shared/types/ipc';

/**
 * 다이얼로그 핸들러 등록
 */
export function registerDialogHandlers(): void {
  // 폴더 선택 다이얼로그
  ipcMain.handle('dialog:selectFolder', async (event): Promise<IpcResponse<string>> => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return {
          success: false,
          error: {
            code: 'WINDOW_NOT_FOUND',
            message: '윈도우를 찾을 수 없습니다.',
            timestamp: new Date().toISOString()
          }
        };
      }

      const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory', 'createDirectory'],
        title: '프롬프트 저장 위치 선택',
        buttonLabel: '선택'
      });

      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: false,
          error: {
            code: 'CANCELED',
            message: '취소되었습니다.',
            timestamp: new Date().toISOString()
          }
        };
      }

      return {
        success: true,
        data: result.filePaths[0]
      };
    } catch (error) {
      console.error('Dialog error:', error);
      return {
        success: false,
        error: {
          code: 'DIALOG_ERROR',
          message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
          timestamp: new Date().toISOString()
        }
      };
    }
  });
}
