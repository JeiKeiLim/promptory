/**
 * 자동 업데이트 서비스
 */

import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import { isDev } from '../utils/environment';

export class UpdateService {
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupAutoUpdater();
  }

  private setupAutoUpdater(): void {
    // 개발 모드에서는 자동 업데이트 비활성화
    if (isDev) {
      autoUpdater.updateConfigPath = null;
      return;
    }

    // 자동 업데이트 설정
    autoUpdater.checkForUpdatesAndNotify();

    // 업데이트 이벤트 리스너
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      this.showUpdateAvailableDialog(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
    });

    autoUpdater.on('error', (err) => {
      console.error('Error in auto-updater:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      console.log(log_message);

      // 메인 윈도우에 진행률 전송
      if (this.mainWindow) {
        this.mainWindow.webContents.send('download-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      this.showUpdateDownloadedDialog();
    });
  }

  private showUpdateAvailableDialog(info: any): void {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '업데이트 사용 가능',
      message: `새로운 버전 ${info.version}이 사용 가능합니다.`,
      detail: '업데이트를 다운로드하시겠습니까?',
      buttons: ['나중에', '다운로드'],
      defaultId: 1,
      cancelId: 0
    }).then((result) => {
      if (result.response === 1) {
        autoUpdater.downloadUpdate();
      }
    });
  }

  private showUpdateDownloadedDialog(): void {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '업데이트 준비 완료',
      message: '업데이트가 다운로드되었습니다.',
      detail: '지금 다시 시작하여 업데이트를 적용하시겠습니까?',
      buttons: ['나중에', '지금 다시 시작'],
      defaultId: 1,
      cancelId: 0
    }).then((result) => {
      if (result.response === 1) {
        autoUpdater.quitAndInstall();
      }
    });
  }

  public checkForUpdates(): void {
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  }

  public downloadUpdate(): void {
    if (!isDev) {
      autoUpdater.downloadUpdate();
    }
  }

  public quitAndInstall(): void {
    if (!isDev) {
      autoUpdater.quitAndInstall();
    }
  }
}

