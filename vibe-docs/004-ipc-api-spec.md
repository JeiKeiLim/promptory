# Promptory Electron IPC API 명세서

## API 개요

### 목적과 기능
Promptory의 Electron 메인 프로세스와 렌더러 프로세스 간의 안전하고 효율적인 통신을 위한 IPC API를 정의합니다.

### 대상 사용자
- 프론트엔드 개발자 (렌더러 프로세스)
- 백엔드 개발자 (메인 프로세스)

### 사용 기술 스택
- **IPC 프레임워크**: Electron IPC (invoke/handle, send/on)
- **데이터 직렬화**: JSON
- **타입 시스템**: TypeScript 인터페이스
- **에러 처리**: 표준화된 에러 응답 구조

### 버전 정보
- **API 버전**: 1.0.0
- **Electron 버전**: 32+
- **Node.js 버전**: v24.7.0 LTS
- **호환성**: contextIsolation 활성화 환경

## 통신 패턴 및 아키텍처

### IPC 통신 패턴 설계

#### 1. invoke/handle 패턴 (요청-응답)
```typescript
// 렌더러 → 메인
const result = await window.electronAPI.invoke('channel-name', ...args);

// 메인 프로세스
ipcMain.handle('channel-name', async (event, ...args) => {
  // 처리 로직
  return response;
});
```
**사용 용도**: 데이터 조회, 파일 조작, 설정 변경 등 대부분의 작업

#### 2. send/on 패턴 (이벤트 기반)
```typescript
// 메인 → 렌더러 (일방향 알림)
mainWindow.webContents.send('event-name', data);

// 렌더러에서 수신
window.electronAPI.on('event-name', (data) => {
  // 이벤트 처리
});
```
**사용 용도**: 파일 변경 알림, 진행 상황 업데이트, 시스템 알림

### 에러 처리 전략

#### 표준 응답 구조
```typescript
interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}
```

#### 에러 처리 계층
1. **메인 프로세스**: 파일 시스템 오류, 파싱 오류 등 기술적 오류 처리
2. **렌더러 프로세스**: 사용자 인터페이스 오류 표시 및 사용자 확인

## 데이터 모델

### 공통 타입 정의

```typescript
// 프롬프트 메타데이터
interface PromptMetadata {
  title: string;
  description?: string;
  tags: string[];
  favorite: boolean;
  created_at: string; // ISO 8601
  parameters: PromptParameter[];
}

// 파라미터 정의
interface PromptParameter {
  name: string;
  type: 'string' | 'category';
  required: boolean;
  description?: string;
  options?: string[]; // category 타입일 때만
}

// 프롬프트 파일 정보
interface PromptFileInfo {
  id: string;
  path: string;
  metadata: PromptMetadata;
  modifiedAt: string;
  fileSize: number;
  error?: FileError;
}

// 검색 결과
interface SearchResult {
  files: PromptFileInfo[];
  totalCount: number;
  query: string;
  searchTime: number; // ms
}

// 파일 오류
interface FileError {
  type: 'YAML_PARSE_ERROR' | 'FILE_READ_ERROR' | 'PARAMETER_MISMATCH';
  message: string;
  details?: any;
}
```

## API 엔드포인트 목록

| 카테고리 | 메서드 | 채널명 | 설명 |
|---------|--------|--------|------|
| 프로젝트 | invoke | `project:init` | 프로젝트 초기화 |
| 프로젝트 | invoke | `project:switch` | 프로젝트 디렉토리 변경 |
| 파일 | invoke | `file:list` | 프롬프트 파일 목록 조회 |
| 파일 | invoke | `file:read` | 프롬프트 파일 읽기 |
| 파일 | invoke | `file:create` | 새 프롬프트 생성 |
| 파일 | invoke | `file:update` | 프롬프트 수정 |
| 파일 | invoke | `file:delete` | 프롬프트 삭제 |
| 폴더 | invoke | `folder:create` | 폴더 생성 |
| 폴더 | invoke | `folder:rename` | 폴더 이름 변경 |
| 폴더 | invoke | `folder:delete` | 폴더 삭제 |
| 검색 | invoke | `search:query` | 프롬프트 검색 |
| 검색 | invoke | `search:rebuild-index` | 인덱스 재구축 |
| 태그 | invoke | `tags:list` | 태그 목록 조회 |
| 태그 | invoke | `tags:autocomplete` | 태그 자동완성 |
| 설정 | invoke | `config:get` | 설정 조회 |
| 설정 | invoke | `config:set` | 설정 변경 |
| 이벤트 | on | `file:changed` | 파일 변경 알림 |
| 이벤트 | on | `file:error` | 파일 오류 알림 |

## API 상세 명세

### 프로젝트 관리

#### 엔드포인트: invoke project:init

##### 개요
새 프로젝트 디렉토리를 초기화하고 기본 구조를 생성합니다.

##### 요청 파라미터
```typescript
interface ProjectInitRequest {
  path: string;          // 프로젝트 디렉토리 경로
  createSamples: boolean; // 샘플 프롬프트 생성 여부
}
```

##### 응답
```typescript
interface ProjectInitResponse {
  projectPath: string;
  samplesCreated: number;
}
```

##### 사용 예시
```typescript
const result = await window.electronAPI.invoke('project:init', {
  path: '/Users/user/MyPrompts',
  createSamples: true
});
```

#### 엔드포인트: invoke project:switch

##### 개요
현재 프로젝트 디렉토리를 변경합니다.

##### 요청 파라미터
```typescript
interface ProjectSwitchRequest {
  path: string; // 새 프로젝트 디렉토리 경로
}
```

##### 응답
```typescript
interface ProjectSwitchResponse {
  projectPath: string;
  fileCount: number;
}
```

### 파일 관리

#### 엔드포인트: invoke file:list

##### 개요
현재 프로젝트의 모든 프롬프트 파일 목록을 조회합니다.

##### 요청 파라미터
```typescript
interface FileListRequest {
  includeContent: boolean; // 파일 내용 포함 여부 (기본값: false)
  sortBy?: 'name' | 'modified' | 'created'; // 정렬 기준
  sortOrder?: 'asc' | 'desc'; // 정렬 순서
}
```

##### 응답
```typescript
interface FileListResponse {
  files: PromptFileInfo[];
  totalCount: number;
}
```

#### 엔드포인트: invoke file:read

##### 개요
특정 프롬프트 파일의 전체 내용을 읽습니다.

##### 요청 파라미터
```typescript
interface FileReadRequest {
  path: string; // 파일 상대 경로
}
```

##### 응답
```typescript
interface FileReadResponse {
  id: string;
  path: string;
  metadata: PromptMetadata;
  content: string;
  modifiedAt: string;
}
```

#### 엔드포인트: invoke file:create

##### 개요
새로운 프롬프트 파일을 생성합니다.

##### 요청 파라미터
```typescript
interface FileCreateRequest {
  folderPath?: string; // 생성할 폴더 (선택적)
  metadata: PromptMetadata;
  content: string;
}
```

##### 응답
```typescript
interface FileCreateResponse {
  id: string;
  path: string; // 생성된 파일의 경로
}
```

#### 엔드포인트: invoke file:update

##### 개요
기존 프롬프트 파일을 수정합니다.

##### 요청 파라미터
```typescript
interface FileUpdateRequest {
  path: string;
  metadata: PromptMetadata;
  content: string;
}
```

##### 응답
```typescript
interface FileUpdateResponse {
  success: boolean;
  modifiedAt: string;
}
```

#### 엔드포인트: invoke file:delete

##### 개요
프롬프트 파일을 삭제합니다.

##### 요청 파라미터
```typescript
interface FileDeleteRequest {
  path: string;
  createBackup: boolean; // 백업 생성 여부
}
```

##### 응답
```typescript
interface FileDeleteResponse {
  success: boolean;
  backupPath?: string; // 백업이 생성된 경우
}
```

### 폴더 관리

#### 엔드포인트: invoke folder:create

##### 개요
새 폴더를 생성합니다.

##### 요청 파라미터
```typescript
interface FolderCreateRequest {
  path: string; // 생성할 폴더 경로
}
```

##### 응답
```typescript
interface FolderCreateResponse {
  path: string;
  created: boolean;
}
```

#### 엔드포인트: invoke folder:rename

##### 개요
폴더 이름을 변경합니다.

##### 요청 파라미터
```typescript
interface FolderRenameRequest {
  oldPath: string;
  newName: string;
}
```

##### 응답
```typescript
interface FolderRenameResponse {
  oldPath: string;
  newPath: string;
  affectedFiles: number; // 영향받은 파일 수
}
```

#### 엔드포인트: invoke folder:delete

##### 개요
폴더를 삭제합니다.

##### 요청 파라미터
```typescript
interface FolderDeleteRequest {
  path: string;
  recursive: boolean; // 하위 파일/폴더도 삭제
}
```

##### 응답
```typescript
interface FolderDeleteResponse {
  deleted: boolean;
  deletedFiles: number;
}
```

### 검색 및 인덱싱

#### 엔드포인트: invoke search:query

##### 개요
프롬프트를 검색합니다.

##### 요청 파라미터
```typescript
interface SearchRequest {
  query: string;
  scope: {
    title: boolean;
    tags: boolean;
    content: boolean;
  };
  filters?: {
    tags?: string[];
    favorite?: boolean;
    folderPath?: string;
  };
  limit?: number; // 최대 결과 수 (기본값: 100)
}
```

##### 응답
```typescript
interface SearchResponse {
  files: PromptFileInfo[];
  totalCount: number;
  query: string;
  searchTime: number;
}
```

#### 엔드포인트: invoke search:rebuild-index

##### 개요
검색 인덱스를 재구축합니다.

##### 요청 파라미터
없음

##### 응답
```typescript
interface RebuildIndexResponse {
  success: boolean;
  indexedFiles: number;
  rebuildTime: number; // ms
}
```

### 태그 관리

#### 엔드포인트: invoke tags:list

##### 개요
모든 태그 목록을 조회합니다.

##### 요청 파라미터
없음

##### 응답
```typescript
interface TagsListResponse {
  tags: Array<{
    name: string;
    count: number;
    lastUsed: string;
  }>;
}
```

#### 엔드포인트: invoke tags:autocomplete

##### 개요
태그 자동완성을 위한 제안 목록을 조회합니다.

##### 요청 파라미터
```typescript
interface TagsAutocompleteRequest {
  query: string; // 입력된 부분 문자열
  limit?: number; // 최대 제안 수 (기본값: 10)
}
```

##### 응답
```typescript
interface TagsAutocompleteResponse {
  suggestions: string[];
}
```

### 설정 관리

#### 엔드포인트: invoke config:get

##### 개요
앱 설정을 조회합니다.

##### 요청 파라미터
```typescript
interface ConfigGetRequest {
  key?: string; // 특정 설정 키 (선택적, 없으면 전체 설정)
}
```

##### 응답
```typescript
interface ConfigGetResponse {
  config: any; // 설정 객체 또는 특정 값
}
```

#### 엔드포인트: invoke config:set

##### 개요
앱 설정을 변경합니다.

##### 요청 파라미터
```typescript
interface ConfigSetRequest {
  key: string;
  value: any;
}
```

##### 응답
```typescript
interface ConfigSetResponse {
  success: boolean;
  previousValue?: any;
}
```

### 이벤트 기반 알림

#### 이벤트: file:changed

##### 개요
파일 시스템에서 파일 변경이 감지될 때 발생하는 이벤트입니다.

##### 이벤트 데이터
```typescript
interface FileChangedEvent {
  type: 'created' | 'modified' | 'deleted' | 'moved';
  path: string;
  newPath?: string; // moved 이벤트일 때
  fileInfo?: PromptFileInfo; // created/modified 이벤트일 때
}
```

##### 수신 방법
```typescript
window.electronAPI.on('file:changed', (event: FileChangedEvent) => {
  // 파일 변경 처리 로직
});
```

#### 이벤트: file:error

##### 개요
파일 처리 중 오류가 발생할 때 발생하는 이벤트입니다.

##### 이벤트 데이터
```typescript
interface FileErrorEvent {
  path: string;
  error: FileError;
  canRecover: boolean; // 자동 복구 가능 여부
  recoveryOptions?: string[]; // 복구 옵션 목록
}
```

## 에러 코드 및 처리

### 표준 에러 코드

| 코드 | 설명 | HTTP 유사 코드 |
|------|------|----------------|
| `PROJECT_NOT_FOUND` | 프로젝트 디렉토리를 찾을 수 없음 | 404 |
| `FILE_NOT_FOUND` | 파일을 찾을 수 없음 | 404 |
| `PERMISSION_DENIED` | 파일/폴더 접근 권한 없음 | 403 |
| `YAML_PARSE_ERROR` | YAML 헤더 파싱 오류 | 400 |
| `INVALID_PARAMETER` | 잘못된 요청 파라미터 | 400 |
| `FILE_ALREADY_EXISTS` | 파일이 이미 존재함 | 409 |
| `DISK_SPACE_FULL` | 디스크 공간 부족 | 507 |
| `INTERNAL_ERROR` | 내부 서버 오류 | 500 |

### 에러 응답 예시

```json
{
  "success": false,
  "error": {
    "code": "YAML_PARSE_ERROR",
    "message": "Invalid YAML syntax at line 5",
    "details": {
      "file": "development/broken-prompt.md",
      "line": 5,
      "column": 12
    },
    "timestamp": "2024-01-15T10:30:45.123Z"
  }
}
```

## 캐싱 전략

### 메인 프로세스 캐시
- **검색 인덱스**: 메모리에 상주, 파일 변경 시 실시간 업데이트
- **태그 캐시**: 메모리에 상주, 파일 변경 시 업데이트
- **설정 캐시**: 메모리에 상주, 변경 시 즉시 디스크 저장

### 렌더러 프로세스 캐시
- **프롬프트 목록**: 5분간 캐시, 파일 변경 이벤트 시 무효화
- **검색 결과**: 쿼리별 3분간 캐시
- **자주 사용하는 프롬프트**: 10개까지 세션 동안 캐시

### 캐시 무효화 정책
- 파일 변경 이벤트 발생 시 관련 캐시 즉시 무효화
- 프로젝트 전환 시 모든 캐시 클리어
- 메모리 사용량이 임계값 초과 시 LRU 방식으로 캐시 정리

## 보안 고려사항

### contextIsolation 활성화
```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: Function) => ipcRenderer.on(channel, callback),
});
```

### 채널 화이트리스트
```typescript
// 허용된 IPC 채널만 처리
const ALLOWED_CHANNELS = [
  'project:init', 'project:switch',
  'file:list', 'file:read', 'file:create', 'file:update', 'file:delete',
  // ... 기타 허용된 채널들
];

ipcMain.handle(channel, async (event, ...args) => {
  if (!ALLOWED_CHANNELS.includes(channel)) {
    throw new Error(`Unauthorized channel: ${channel}`);
  }
  // 처리 로직
});
```

### 경로 검증
```typescript
// 디렉토리 순회 공격 방지
function validatePath(userPath: string, basePath: string): string {
  const resolvedPath = path.resolve(basePath, userPath);
  if (!resolvedPath.startsWith(path.normalize(basePath))) {
    throw new Error('Invalid path: directory traversal detected');
  }
  return resolvedPath;
}
```

## 성능 최적화

### 지연 로딩
- 프롬프트 내용은 `file:read` 호출 시에만 로드
- 폴더 구조는 필요 시에만 스캔
- 검색 인덱스는 백그라운드에서 점진적 구축

### 배치 처리
```typescript
// 여러 파일 작업을 배치로 처리
interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  path: string;
  data?: any;
}

// invoke file:batch
const results = await window.electronAPI.invoke('file:batch', operations);
```

### 메모리 관리
- 대용량 파일은 스트리밍 처리
- 사용하지 않는 캐시는 주기적으로 정리
- 메모리 사용량 모니터링 및 임계값 관리

## 변경 이력

### v1.0.0 (2024-01-15)
- 초기 IPC API 설계
- 기본 파일 관리 기능
- 검색 및 인덱싱 기능
- 설정 관리 기능
- 이벤트 기반 파일 감시

## 구현 가이드라인

### TypeScript 인터페이스 활용
```typescript
// shared/types.ts - 공통 타입 정의
export interface PromptMetadata { /* ... */ }
export interface IpcResponse<T> { /* ... */ }

// main/ipc-handlers.ts - 메인 프로세스
import { PromptMetadata, IpcResponse } from '../shared/types';

// renderer/api.ts - 렌더러 프로세스
import { PromptMetadata, IpcResponse } from '../shared/types';
```

### 에러 처리 표준화
```typescript
// 공통 에러 처리 유틸리티
export function createErrorResponse(code: string, message: string, details?: any): IpcResponse {
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
```

### 테스트 가능한 구조
```typescript
// IPC 핸들러를 순수 함수로 분리
export async function handleFileRead(request: FileReadRequest): Promise<FileReadResponse> {
  // 비즈니스 로직
}

// IPC 등록은 별도로
ipcMain.handle('file:read', async (event, request) => {
  try {
    return await handleFileRead(request);
  } catch (error) {
    return createErrorResponse('FILE_READ_ERROR', error.message);
  }
});
```

이 IPC API 명세서는 Promptory의 안전하고 효율적인 메인-렌더러 프로세스 통신을 위한 완전한 가이드라인을 제공합니다.
