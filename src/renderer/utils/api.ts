/**
 * IPC 통신을 위한 API 클라이언트
 */

import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import type { IpcResponse } from '@shared/types/ipc';
import type { 
  PromptFileInfo, 
  PromptFile, 
  FileListOptions,
  SearchRequest,
  SearchResult
} from '@shared/types/prompt';

// API 에러 클래스
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * IPC 응답을 처리하고 에러 시 예외 발생
 */
function handleResponse<T>(response: IpcResponse<T>): T {
  if (response.success) {
    return response.data!;
  } else {
    throw new ApiError(
      response.error?.message || 'Unknown error',
      response.error?.code || 'UNKNOWN_ERROR',
      response.error?.details
    );
  }
}

/**
 * Promptory API 클라이언트
 */
export class PromptoryAPI {
  /**
   * 프롬프트 파일 목록 조회
   */
  async listFiles(options: FileListOptions = {}): Promise<PromptFileInfo[]> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.FILE_LIST, options);
    return handleResponse(response);
  }

  /**
   * 프롬프트 파일 읽기
   */
  async readFile(path: string): Promise<PromptFile> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.FILE_READ, path);
    return handleResponse(response);
  }

  /**
   * 프롬프트 파일 생성
   */
  async createFile(data: {
    folderPath?: string;
    metadata: any;
    content: string;
  }): Promise<{ path: string }> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.FILE_CREATE, data);
    return handleResponse(response);
  }

  /**
   * 프롬프트 파일 수정
   */
  async updateFile(path: string, data: {
    metadata: any;
    content: string;
  }): Promise<{ success: boolean }> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.FILE_UPDATE, path, data);
    return handleResponse(response);
  }

  /**
   * 프롬프트 파일 삭제
   */
  async deleteFile(path: string, createBackup: boolean = false): Promise<{ backupPath?: string }> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.FILE_DELETE, path, createBackup);
    return handleResponse(response);
  }

  /**
   * 프롬프트 검색
   */
  async searchPrompts(query: SearchRequest): Promise<SearchResult> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.SEARCH_QUERY, query);
    return handleResponse(response);
  }

  /**
   * 검색 인덱스 재구축
   */
  async rebuildSearchIndex(): Promise<{ success: boolean; indexedFiles: number; rebuildTime: number }> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.SEARCH_REBUILD_INDEX);
    return handleResponse(response);
  }

  /**
   * 태그 목록 조회
   */
  async getTags(): Promise<Array<{ name: string; count: number; lastUsed: string }>> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.TAGS_LIST);
    return handleResponse(response);
  }

  /**
   * 태그 자동완성
   */
  async getTagSuggestions(query: string, limit: number = 10): Promise<string[]> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.TAGS_AUTOCOMPLETE, { query, limit });
    return handleResponse(response);
  }

  /**
   * 설정 조회
   */
  async getConfig(key?: string): Promise<any> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.CONFIG_GET, { key });
    return handleResponse(response);
  }

  /**
   * 설정 저장
   */
  async setConfig(key: string, value: any): Promise<{ success: boolean; previousValue?: any }> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.CONFIG_SET, { key, value });
    return handleResponse(response);
  }

  /**
   * 폴더 생성
   */
  async createFolder(path: string): Promise<{ path: string; created: boolean }> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.FOLDER_CREATE, { path });
    return handleResponse(response);
  }

  /**
   * 폴더 이름 변경
   */
  async renameFolder(oldPath: string, newName: string): Promise<{
    oldPath: string;
    newPath: string;
    affectedFiles: number;
  }> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.FOLDER_RENAME, { oldPath, newName });
    return handleResponse(response);
  }

  /**
   * 폴더 삭제
   */
  async deleteFolder(path: string, recursive: boolean = false): Promise<{
    deleted: boolean;
    deletedFiles: number;
  }> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.FOLDER_DELETE, { path, recursive });
    return handleResponse(response);
  }

  /**
   * 프로젝트 초기화
   */
  async initProject(path: string, createSamples: boolean = false): Promise<{
    projectPath: string;
    samplesCreated: number;
  }> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.PROJECT_INIT, { path, createSamples });
    return handleResponse(response);
  }

  /**
   * 프로젝트 전환
   */
  async switchProject(path: string): Promise<{
    projectPath: string;
    fileCount: number;
  }> {
    const response = await window.electronAPI.invoke(IPC_CHANNELS.PROJECT_SWITCH, { path });
    return handleResponse(response);
  }
}

// 싱글톤 API 인스턴스
export const promptoryAPI = new PromptoryAPI();

