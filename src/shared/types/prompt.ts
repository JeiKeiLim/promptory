/**
 * 프롬프트 관련 타입 정의
 */

// 파라미터 정의
export interface PromptParameter {
  name: string;
  type: 'string' | 'category';
  required: boolean;
  description?: string;
  options?: string[]; // category 타입일 때만
}

// 프롬프트 메타데이터
export interface PromptMetadata {
  title: string;
  description?: string;
  tags: string[];
  favorite: boolean;
  created_at: string; // ISO 8601
  parameters: PromptParameter[];
}

// 파일 오류
export interface FileError {
  type: 'YAML_PARSE_ERROR' | 'FILE_READ_ERROR' | 'PARAMETER_MISMATCH';
  message: string;
  details?: any;
}

// 프롬프트 파일 정보
export interface PromptFileInfo {
  id: string;
  path: string;
  metadata: PromptMetadata;
  modifiedAt: string;
  fileSize: number;
  error?: FileError;
}

// 완전한 프롬프트 파일 (내용 포함)
export interface PromptFile extends PromptFileInfo {
  content: string;
  rawContent?: string; // 오류 시 원본 내용
}

// 파일 목록 요청 옵션
export interface FileListOptions {
  includeContent?: boolean;
  sortBy?: 'name' | 'modified' | 'created';
  sortOrder?: 'asc' | 'desc';
}

// 검색 요청
export interface SearchRequest {
  query: string;
  scope?: {
    title: boolean;
    tags: boolean;
    content: boolean;
  };
  filters?: {
    tags?: string[];
    favorite?: boolean;
    folderPath?: string;
  };
  limit?: number;
  offset?: number;
}

// 검색 결과
export interface SearchResult {
  results: PromptFileInfo[];
  total: number;
  query: string;
  searchTime: number; // ms
}
