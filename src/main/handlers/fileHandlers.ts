/**
 * 파일 관련 IPC 핸들러
 */

import { ipcMain } from 'electron';
import { FileService } from '../services/FileService';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import type { IpcResponse } from '@shared/types/ipc';
import type { 
  PromptFileInfo, 
  PromptFile, 
  FileListOptions 
} from '@shared/types/prompt';
import type { FileCreateData, FileUpdateData } from '../services/FileService';

// 파일 서비스 인스턴스 (나중에 프로젝트 초기화 시 설정)
let fileService: FileService | null = null;

/**
 * 파일 서비스 설정
 * @param projectPath - 프로젝트 경로
 */
export async function setFileService(projectPath: string): Promise<void> {
  fileService = new FileService(projectPath);
  await fileService.initialize();
}

/**
 * 파일 서비스 인스턴스 반환
 * @returns 파일 서비스 인스턴스
 * @throws Error - 파일 서비스가 초기화되지 않은 경우
 */
function getFileService(): FileService {
  if (!fileService) {
    throw new Error('File service not initialized. Please initialize project first.');
  }
  return fileService;
}

/**
 * Shared file service getter for other handlers
 * @returns 파일 서비스 인스턴스
 * @throws Error - 파일 서비스가 초기화되지 않은 경우
 */
export function getSharedFileService(): FileService {
  return getFileService();
}

/**
 * 에러 응답 생성 헬퍼
 * @param code - 에러 코드
 * @param message - 에러 메시지
 * @param details - 추가 정보
 * @returns IPC 에러 응답
 */
function createErrorResponse(code: string, message: string, details?: any): IpcResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * 파일 목록 조회 핸들러
 */
ipcMain.handle(IPC_CHANNELS.FILE_LIST, async (_event, options: FileListOptions): Promise<IpcResponse<PromptFileInfo[]>> => {
  try {
    const files = await getFileService().listFiles(options);
    return {
      success: true,
      data: files
    };
  } catch (error) {
    console.error('FILE_LIST error:', error);
    return createErrorResponse(
      'FILE_LIST_ERROR',
      error instanceof Error ? error.message : 'Failed to list files'
    );
  }
});

/**
 * 파일 읽기 핸들러
 */
ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_event, path: string): Promise<IpcResponse<PromptFile>> => {
  try {
    if (!path || typeof path !== 'string') {
      return createErrorResponse('INVALID_PARAMETER', 'File path is required');
    }

    const file = await getFileService().readFile(path);
    return {
      success: true,
      data: file
    };
  } catch (error) {
    console.error('FILE_READ error:', error);
    
    // 파일을 찾을 수 없는 경우
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return createErrorResponse('FILE_NOT_FOUND', `File not found: ${path}`);
    }
    
    return createErrorResponse(
      'FILE_READ_ERROR',
      error instanceof Error ? error.message : 'Failed to read file'
    );
  }
});

/**
 * 파일 생성 핸들러
 */
ipcMain.handle(IPC_CHANNELS.FILE_CREATE, async (_event, data: FileCreateData): Promise<IpcResponse<PromptFile>> => {
  try {
    if (!data || !data.metadata || !data.content) {
      return createErrorResponse('INVALID_PARAMETER', 'File data, metadata, and content are required');
    }

    if (!data.metadata.title) {
      return createErrorResponse('INVALID_PARAMETER', 'File title is required');
    }

    const filePath = await getFileService().createFile(data);
    
    // 생성된 파일을 다시 읽어서 전체 데이터 반환
    const createdFile = await getFileService().readFile(filePath);
    return {
      success: true,
      data: createdFile
    };
  } catch (error) {
    console.error('FILE_CREATE error:', error);
    
    // 파일이 이미 존재하는 경우
    if (error instanceof Error && error.message.includes('already exists')) {
      return createErrorResponse('FILE_ALREADY_EXISTS', error.message);
    }
    
    // 권한 오류
    if (error instanceof Error && error.message.includes('permission denied')) {
      return createErrorResponse('PERMISSION_DENIED', error.message);
    }
    
    return createErrorResponse(
      'FILE_CREATE_ERROR',
      error instanceof Error ? error.message : 'Failed to create file'
    );
  }
});

/**
 * 파일 업데이트 핸들러
 */
ipcMain.handle(IPC_CHANNELS.FILE_UPDATE, async (_event, path: string, data: { content: string } | FileUpdateData): Promise<IpcResponse<PromptFile>> => {
  try {
    if (!path || typeof path !== 'string') {
      return createErrorResponse('INVALID_PARAMETER', 'File path is required');
    }

    let updateData: FileUpdateData;
    
    // 새로운 형식 (전체 마크다운 내용)인지 확인
    if ('content' in data && typeof data.content === 'string' && !('metadata' in data)) {
      // 전체 마크다운 내용에서 메타데이터와 내용 파싱
      const { parsePromptFile } = await import('../utils/yamlParser');
      const { metadata, content } = parsePromptFile(data.content);
      
      // newFolderPath가 있으면 보존
      const dataWithFolder = data as { content: string; newFolderPath?: string };
      updateData = { 
        metadata, 
        content,
        newFolderPath: dataWithFolder.newFolderPath
      };
    } else {
      // 기존 형식 (메타데이터와 내용 분리)
      const fileUpdateData = data as FileUpdateData;
      if (!fileUpdateData.metadata || !fileUpdateData.content) {
        return createErrorResponse('INVALID_PARAMETER', 'File data, metadata, and content are required');
      }
      updateData = fileUpdateData;
    }

    await getFileService().updateFile(path, updateData);
    
    // 폴더 이동이 있었다면 새 경로로 파일 읽기
    let finalPath = path;
    if (updateData.newFolderPath !== undefined) {
      const fileName = path.split('/').pop() || 'untitled.md';
      finalPath = updateData.newFolderPath 
        ? `${updateData.newFolderPath}/${fileName}`
        : fileName;
    }
    
    // 업데이트된 파일을 다시 읽어서 전체 데이터 반환
    const updatedFile = await getFileService().readFile(finalPath);
    return {
      success: true,
      data: updatedFile
    };
  } catch (error) {
    console.error('FILE_UPDATE error:', error);
    
    // 파일을 찾을 수 없는 경우
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return createErrorResponse('FILE_NOT_FOUND', `File not found: ${path}`);
    }
    
    // 권한 오류
    if (error instanceof Error && error.message.includes('permission denied')) {
      return createErrorResponse('PERMISSION_DENIED', error.message);
    }
    
    // YAML 파싱 오류
    if (error instanceof Error && error.message.includes('YAML')) {
      return createErrorResponse('YAML_PARSE_ERROR', error.message);
    }
    
    return createErrorResponse(
      'FILE_UPDATE_ERROR',
      error instanceof Error ? error.message : 'Failed to update file'
    );
  }
});

/**
 * 파일 삭제 핸들러
 */
ipcMain.handle(IPC_CHANNELS.FILE_DELETE, async (_event, path: string, createBackup: boolean = false): Promise<IpcResponse<{ backupPath?: string }>> => {
  try {
    if (!path || typeof path !== 'string') {
      return createErrorResponse('INVALID_PARAMETER', 'File path is required');
    }

    const backupPath = await getFileService().deleteFile(path, createBackup);
    return {
      success: true,
      data: { backupPath }
    };
  } catch (error) {
    console.error('FILE_DELETE error:', error);
    
    // 파일을 찾을 수 없는 경우
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return createErrorResponse('FILE_NOT_FOUND', `File not found: ${path}`);
    }
    
    // 권한 오류
    if (error instanceof Error && error.message.includes('permission denied')) {
      return createErrorResponse('PERMISSION_DENIED', error.message);
    }
    
    return createErrorResponse(
      'FILE_DELETE_ERROR',
      error instanceof Error ? error.message : 'Failed to delete file'
    );
  }
});

/**
 * 폴더 목록 핸들러
 */
ipcMain.handle(IPC_CHANNELS.FOLDER_LIST, async (): Promise<IpcResponse<Array<{ name: string; path: string; count: number }>>> => {
  try {
    const folders = await getFileService().listFolders();
    return {
      success: true,
      data: folders
    };
  } catch (error) {
    console.error('FOLDER_LIST error:', error);
    
    return createErrorResponse(
      'FOLDER_LIST_ERROR',
      error instanceof Error ? error.message : 'Failed to list folders'
    );
  }
});

/**
 * 폴더 생성 핸들러
 */
ipcMain.handle(IPC_CHANNELS.FOLDER_CREATE, async (_event, folderName: string): Promise<IpcResponse<string>> => {
  try {
    if (!folderName || typeof folderName !== 'string') {
      return createErrorResponse('INVALID_PARAMETER', 'Folder name is required');
    }

    const folderPath = await getFileService().createFolder(folderName);
    return {
      success: true,
      data: folderPath
    };
  } catch (error) {
    console.error('FOLDER_CREATE error:', error);
    
    return createErrorResponse(
      'FOLDER_CREATE_ERROR',
      error instanceof Error ? error.message : 'Failed to create folder'
    );
  }
});

console.log('File handlers registered');
