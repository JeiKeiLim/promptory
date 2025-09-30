/**
 * IPC 통신을 위한 타입 정의
 */

// 기본 IPC 응답 구조
export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// 에러 타입 정의
export enum ErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  YAML_PARSE_ERROR = 'YAML_PARSE_ERROR',
  PARAMETER_MISMATCH = 'PARAMETER_MISMATCH',
  DISK_SPACE_FULL = 'DISK_SPACE_FULL',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// IPC 채널 정의
export const IPC_CHANNELS = {
  // 프로젝트 관리
  PROJECT_INIT: 'project:init',
  PROJECT_SWITCH: 'project:switch',
  
  // 파일 관리
  FILE_LIST: 'file:list',
  FILE_READ: 'file:read',
  FILE_CREATE: 'file:create',
  FILE_UPDATE: 'file:update',
  FILE_DELETE: 'file:delete',
  
  // 폴더 관리
  FOLDER_CREATE: 'folder:create',
  FOLDER_RENAME: 'folder:rename',
  FOLDER_DELETE: 'folder:delete',
  
  // 검색
  SEARCH_QUERY: 'search:query',
  SEARCH_REBUILD_INDEX: 'search:rebuild-index',
  
  // 태그
  TAGS_LIST: 'tags:list',
  TAGS_AUTOCOMPLETE: 'tags:autocomplete',
  
  // 설정
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  
  // 이벤트
  FILE_CHANGED: 'file:changed',
  FILE_ERROR: 'file:error'
} as const;

// 테스트용 ping/pong
export interface PingRequest {
  message: string;
}

export interface PongResponse {
  message: string;
  timestamp: string;
}

