/**
 * Electron 메인 프로세스
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { promises as fs } from 'fs';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import type { IpcResponse, PingRequest, PongResponse } from '@shared/types/ipc';
import './handlers/fileHandlers';
import { setFileService } from './handlers/fileHandlers';
import { registerWindowHandlers } from './handlers/windowHandlers';
import { registerDialogHandlers } from './handlers/dialogHandlers';
import { initializeLLMHandlers, cleanupOnQuit } from './handlers/llmHandlers';
import { initializeFileWatcher, disposeFileWatcher } from './services/FileWatcherService';
import { UpdateService } from './services/UpdateService';
import { homedir } from 'os';

// 개발 환경 여부 확인
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 메인 윈도우 참조
let mainWindow: BrowserWindow | null = null;

// 업데이트 서비스 참조
let updateService: UpdateService | null = null;

// 프로젝트 경로 (메모리에 저장)
let currentProjectPath: string = '';

// 설정 파일 경로
const getSettingsPath = () => join(app.getPath('userData'), 'settings.json');

/**
 * 설정 저장
 */
async function saveSettings(): Promise<void> {
  try {
    const settings = {
      projectPath: currentProjectPath,
    };
    await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
    console.log('Settings saved:', settings);
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * 설정 로드
 */
async function loadSettings(): Promise<void> {
  try {
    const data = await fs.readFile(getSettingsPath(), 'utf-8');
    const settings = JSON.parse(data);
    currentProjectPath = settings.projectPath || '';
    console.log('Settings loaded:', settings);
  } catch (error) {
    // 설정 파일이 없으면 기본값 사용
    console.log('No settings file found, using defaults');
    currentProjectPath = '';
  }
}

/**
 * 메인 윈도우 생성
 */
function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false, // 보안을 위해 비활성화
      contextIsolation: true, // Context Isolation 활성화
      preload: join(__dirname, '../preload/preload.js'), // Preload 스크립트
      webSecurity: !isDev, // 개발 환경에서만 웹 보안 비활성화
    },
    frame: false, // 네이티브 프레임 제거
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden', // macOS는 기본 버튼 표시
    ...(process.platform !== 'darwin' && {
      titleBarOverlay: {
        color: '#ffffff',
        symbolColor: '#000000',
        height: 40,
      },
    }),
    show: false, // Don't show until all handlers are registered
  });

  // Note: Page will be loaded after all handlers are registered (see initializeApp)
  // Don't load URL/file here - that would start the renderer before handlers are ready

  // 윈도우 닫힘 처리
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * 기본 IPC 핸들러 등록
 */
function registerIpcHandlers(): void {
  // 테스트용 ping/pong 핸들러
  ipcMain.handle(
    IPC_CHANNELS.PING,
    async (_event, request: PingRequest): Promise<IpcResponse<PongResponse>> => {
      try {
        const response: PongResponse = {
          message: `Pong: ${request.message}`,
          timestamp: new Date().toISOString(),
        };

        return {
          success: true,
          data: response,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'PING_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        };
      }
    }
  );

  // 다이얼로그 핸들러 등록
  registerDialogHandlers();

  // 프로젝트 경로 설정 핸들러
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET_PROJECT_PATH,
    async (_event, path: string): Promise<IpcResponse<void>> => {
      try {
        currentProjectPath = path;
        await saveSettings();

        // FileService와 FileWatcher를 새 경로로 재초기화
        const projectPath = currentProjectPath || join(homedir(), 'Promptory');
        await setFileService(projectPath);
        if (mainWindow) {
          await initializeFileWatcher(projectPath, mainWindow);
        }

        return { success: true };
      } catch (error) {
        console.error('SETTINGS_SET_PROJECT_PATH error:', error);
        return {
          success: false,
          error: {
            code: 'SETTINGS_ERROR',
            message: error instanceof Error ? error.message : 'Failed to set project path',
            timestamp: new Date().toISOString(),
          },
        };
      }
    }
  );

  // 프로젝트 경로 가져오기 핸들러
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_PROJECT_PATH, async (): Promise<IpcResponse<string>> => {
    try {
      return {
        success: true,
        data: currentProjectPath || join(homedir(), 'Promptory'),
      };
    } catch (error) {
      console.error('SETTINGS_GET_PROJECT_PATH error:', error);
      return {
        success: false,
        error: {
          code: 'SETTINGS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get project path',
          timestamp: new Date().toISOString(),
        },
      };
    }
  });

  console.log('IPC handlers registered');
}

/**
 * 기본 프로젝트 초기화
 */
async function initializeDefaultProject(mainWindow: BrowserWindow): Promise<void> {
  try {
    // 저장된 설정 로드 (이미 앱 시작 시 로드됨)
    // currentProjectPath가 설정되어 있음

    // 기본 프로젝트 경로 (~/Promptory)
    const projectPath = currentProjectPath || join(homedir(), 'Promptory');

    console.log('Initializing project with path:', projectPath);

    // 파일 서비스 초기화
    await setFileService(projectPath);

    // 렌더러가 로드될 때까지 대기
    await new Promise<void>(resolve => {
      if (mainWindow.webContents.isLoading()) {
        mainWindow.webContents.once('did-finish-load', () => resolve());
      } else {
        resolve();
      }
    });

    // 파일 감시 서비스 초기화
    await initializeFileWatcher(projectPath, mainWindow);

    console.log('Project initialized successfully');
  } catch (error) {
    console.error('Failed to initialize default project:', error);
    // 프로젝트 초기화 실패해도 앱은 계속 실행
  }
}

/**
 * 앱 이벤트 핸들러 등록
 */
function registerAppHandlers(): void {
  // 모든 윈도우가 닫혔을 때
  app.on('window-all-closed', () => {
    // macOS에서는 앱이 활성 상태로 유지
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 앱이 활성화될 때 (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  // 앱 종료 전 정리 작업
  app.on('before-quit', async () => {
    console.log('App is quitting...');
    // LLM 핸들러 정리 (pending/in-progress requests cancellation)
    await cleanupOnQuit();
    // 파일 감시 서비스 정리
    await disposeFileWatcher();
  });
}

/**
 * 앱 초기화
 */
async function initializeApp(): Promise<void> {
  try {
    // Electron 앱이 준비될 때까지 대기
    await app.whenReady();

    console.log('Electron app is ready');

    // 저장된 설정 로드 (가장 먼저 실행)
    await loadSettings();

    // IPC 핸들러 등록
    registerIpcHandlers();

    // 윈도우 제어 핸들러 등록
    registerWindowHandlers();

    // 앱 이벤트 핸들러 등록
    registerAppHandlers();

    // 메인 윈도우 생성
    const mainWindow = createMainWindow();

    // 기본 프로젝트 초기화 (윈도우 생성 후)
    await initializeDefaultProject(mainWindow);

    // LLM 핸들러 초기화 (프로젝트 초기화 후에 실행하여 currentProjectPath가 설정되도록)
    const projectPath = currentProjectPath || join(homedir(), 'Promptory');
    // Store LLM database in workspace directory for consistency with cache.db and results
    const dbPath = join(projectPath, '.promptory', 'llm.db');
    const resultsPath = join(projectPath, '.promptory', 'llm_results');
    await initializeLLMHandlers(dbPath, resultsPath, mainWindow);
    console.log('LLM handlers initialized with db path:', dbPath, 'results path:', resultsPath);

    // NOW load the page after all handlers are registered
    if (isDev) {
      const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
      console.log('Loading development server:', devServerUrl);
      await mainWindow.loadURL(devServerUrl);
    } else {
      const indexPath = join(__dirname, '../renderer/index.html');
      console.log('Loading production file:', indexPath);
      await mainWindow.loadFile(indexPath);
    }

    // 자동 업데이트 서비스 초기화
    updateService = new UpdateService(mainWindow);

    // Show the window after page is loaded
    mainWindow.show();

    // 개발 환경에서는 개발자 도구 열기
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }

    console.log('Main window created, loaded, and shown');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    app.quit();
  }
}

// 앱 초기화 실행
initializeApp();

// 예상치 못한 오류 처리
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
