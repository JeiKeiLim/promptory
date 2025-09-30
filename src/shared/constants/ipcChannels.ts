/**
 * IPC 채널 상수 정의
 */

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
  FILE_CHANGED: 'file:changed', // 파일 변경 알림 (메인 -> 렌더러)
  
  // 폴더 관리
  FOLDER_LIST: 'folder:list',
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
  
  // 다이얼로그
  DIALOG_SELECT_FOLDER: 'dialog:selectFolder',
  
  // 설정
  SETTINGS_SET_PROJECT_PATH: 'settings:setProjectPath',
  SETTINGS_GET_PROJECT_PATH: 'settings:getProjectPath',
  
  // 윈도우 제어
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_CENTER: 'window:center',
  WINDOW_SET_SIZE: 'window:set-size',
  WINDOW_GET_STATE: 'window:get-state',
  
  // 이벤트
  FILE_ERROR: 'file:error',
  
  // 테스트
  PING: 'ping'
} as const;

export const ALLOWED_CHANNELS = Object.values(IPC_CHANNELS);

export const ALLOWED_EVENTS = [
  IPC_CHANNELS.FILE_CHANGED,
  IPC_CHANNELS.FILE_ERROR
];
