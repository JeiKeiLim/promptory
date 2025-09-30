/**
 * 파일 감시 서비스 (chokidar 기반)
 * 프로젝트 폴더의 .md 파일 변경사항을 감지하고 렌더러 프로세스에 알림
 */

import chokidar from 'chokidar';
import { BrowserWindow } from 'electron';
import { join, relative } from 'path';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  relativePath: string;
  timestamp: string;
}

export class FileWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private projectPath: string;
  private mainWindow: BrowserWindow | null = null;
  private isWatching = false;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * 메인 윈도우 참조 설정
   */
  setMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
  }

  /**
   * 파일 감시 시작
   */
  async startWatching(): Promise<void> {
    if (this.isWatching) {
      console.log('File watcher is already running');
      return;
    }

    try {
      // chokidar 옵션 설정
      const watchOptions: chokidar.WatchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.DS_Store',
          '**/.promptory/**', // 캐시 폴더 제외
          '**/Thumbs.db'
        ],
        persistent: true,
        ignoreInitial: true, // 초기 스캔 무시
        followSymlinks: false,
        depth: 10, // 최대 깊이 제한
        awaitWriteFinish: {
          stabilityThreshold: 100, // 파일 쓰기 완료 대기 시간
          pollInterval: 50
        }
      };

      // .md 파일만 감시
      const watchPattern = join(this.projectPath, '**/*.md');
      
      this.watcher = chokidar.watch(watchPattern, watchOptions);

      // 이벤트 리스너 등록
      this.watcher
        .on('add', (path) => this.handleFileEvent('add', path))
        .on('change', (path) => this.handleFileEvent('change', path))
        .on('unlink', (path) => this.handleFileEvent('unlink', path))
        .on('addDir', (path) => this.handleFileEvent('addDir', path))
        .on('unlinkDir', (path) => this.handleFileEvent('unlinkDir', path))
        .on('error', (error) => {
          console.error('File watcher error:', error);
          this.notifyRenderer('file:error', {
            type: 'watcher_error',
            message: error.message,
            timestamp: new Date().toISOString()
          });
        })
        .on('ready', () => {
          console.log('File watcher is ready and watching:', this.projectPath);
          this.isWatching = true;
        });

    } catch (error) {
      console.error('Failed to start file watcher:', error);
      throw error;
    }
  }

  /**
   * 파일 감시 중지
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      console.log('File watcher stopped');
    }
  }

  /**
   * 프로젝트 경로 변경
   */
  async switchProject(newProjectPath: string): Promise<void> {
    await this.stopWatching();
    this.projectPath = newProjectPath;
    await this.startWatching();
  }

  /**
   * 감시 상태 확인
   */
  isActive(): boolean {
    return this.isWatching && this.watcher !== null;
  }

  /**
   * 감시 중인 파일 목록 반환
   */
  getWatchedPaths(): string[] {
    if (!this.watcher) return [];
    
    const watched = this.watcher.getWatched();
    const paths: string[] = [];
    
    Object.keys(watched).forEach(dir => {
      watched[dir].forEach(file => {
        if (file.endsWith('.md')) {
          paths.push(join(dir, file));
        }
      });
    });
    
    return paths;
  }

  /**
   * 파일 이벤트 처리
   */
  private handleFileEvent(type: FileChangeEvent['type'], absolutePath: string): void {
    try {
      const relativePath = relative(this.projectPath, absolutePath);
      
      // .promptory 폴더 내 파일은 무시
      if (relativePath.startsWith('.promptory')) {
        return;
      }

      const event: FileChangeEvent = {
        type,
        path: absolutePath,
        relativePath,
        timestamp: new Date().toISOString()
      };

      console.log(`File ${type}:`, relativePath);

      // 렌더러 프로세스에 알림
      this.notifyRenderer(IPC_CHANNELS.FILE_CHANGED, event);

      // 파일 변경 타입별 추가 처리
      switch (type) {
        case 'add':
          console.log(`New file detected: ${relativePath}`);
          break;
        case 'change':
          console.log(`File modified: ${relativePath}`);
          break;
        case 'unlink':
          console.log(`File deleted: ${relativePath}`);
          break;
        case 'addDir':
          console.log(`New directory: ${relativePath}`);
          break;
        case 'unlinkDir':
          console.log(`Directory deleted: ${relativePath}`);
          break;
      }

    } catch (error) {
      console.error('Error handling file event:', error);
    }
  }

  /**
   * 렌더러 프로세스에 알림 전송
   */
  private notifyRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * 서비스 정리
   */
  async dispose(): Promise<void> {
    await this.stopWatching();
    this.mainWindow = null;
  }
}

// 전역 파일 감시 서비스 인스턴스
let fileWatcherService: FileWatcherService | null = null;

/**
 * 파일 감시 서비스 초기화
 */
export async function initializeFileWatcher(projectPath: string, mainWindow: BrowserWindow): Promise<void> {
  if (fileWatcherService) {
    await fileWatcherService.dispose();
  }

  fileWatcherService = new FileWatcherService(projectPath);
  fileWatcherService.setMainWindow(mainWindow);
  await fileWatcherService.startWatching();
}

/**
 * 파일 감시 서비스 인스턴스 반환
 */
export function getFileWatcherService(): FileWatcherService | null {
  return fileWatcherService;
}

/**
 * 파일 감시 서비스 정리
 */
export async function disposeFileWatcher(): Promise<void> {
  if (fileWatcherService) {
    await fileWatcherService.dispose();
    fileWatcherService = null;
  }
}

