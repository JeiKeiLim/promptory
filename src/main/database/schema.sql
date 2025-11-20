-- Promptory SQLite 데이터베이스 스키마
-- 검색 인덱스 및 캐시 데이터 저장

-- 검색 인덱스 테이블
CREATE TABLE IF NOT EXISTS search_index (
    id TEXT PRIMARY KEY,
    path TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT, -- JSON 배열 문자열
    content TEXT, -- 검색용 평문 내용
    favorite INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    modified_at TEXT NOT NULL,
    file_size INTEGER,
    parameter_count INTEGER DEFAULT 0,
    error_status TEXT -- NULL이면 정상, 오류 시 오류 타입
);

-- 태그 캐시 테이블
CREATE TABLE IF NOT EXISTS tags (
    name TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    last_used TEXT
);

-- 설정 캐시 테이블
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT, -- JSON 직렬화된 값
    updated_at TEXT
);

-- 메타데이터 테이블 (스키마 버전 등)
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 인덱스 생성 (검색 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_search_title ON search_index(title);
CREATE INDEX IF NOT EXISTS idx_search_favorite ON search_index(favorite);
CREATE INDEX IF NOT EXISTS idx_search_modified ON search_index(modified_at);
CREATE INDEX IF NOT EXISTS idx_search_created ON search_index(created_at);
CREATE INDEX IF NOT EXISTS idx_tags_count ON tags(count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_last_used ON tags(last_used DESC);

-- 전문 검색을 위한 FTS 테이블 (선택적)
CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
    id UNINDEXED,
    title,
    tags,
    content,
    content='search_index',
    content_rowid='rowid'
);

-- FTS 트리거 (search_index 변경 시 FTS 테이블 자동 업데이트)
CREATE TRIGGER IF NOT EXISTS search_index_ai AFTER INSERT ON search_index BEGIN
    INSERT INTO search_fts(rowid, id, title, tags, content) 
    VALUES (new.rowid, new.id, new.title, new.tags, new.content);
END;

CREATE TRIGGER IF NOT EXISTS search_index_ad AFTER DELETE ON search_index BEGIN
    INSERT INTO search_fts(search_fts, rowid, id, title, tags, content) 
    VALUES ('delete', old.rowid, old.id, old.title, old.tags, old.content);
END;

CREATE TRIGGER IF NOT EXISTS search_index_au AFTER UPDATE ON search_index BEGIN
    INSERT INTO search_fts(search_fts, rowid, id, title, tags, content) 
    VALUES ('delete', old.rowid, old.id, old.title, old.tags, old.content);
    INSERT INTO search_fts(rowid, id, title, tags, content) 
    VALUES (new.rowid, new.id, new.title, new.tags, new.content);
END;

-- LLM Provider 설정 테이블
CREATE TABLE IF NOT EXISTS provider_configurations (
  id TEXT PRIMARY KEY,
  provider_type TEXT NOT NULL CHECK(provider_type IN ('ollama', 'openai', 'azure_openai', 'gemini')),
  display_name TEXT NOT NULL,
  
  -- 연결 설정
  base_url TEXT,  -- Ollama 및 Azure OpenAI용
  model_name TEXT,  -- 기본 모델
  
  -- 보안 (Electron safeStorage로 암호화된 자격증명)
  encrypted_credentials BLOB,  -- 암호화된 API key/token
  
  -- 설정
  timeout_seconds INTEGER DEFAULT 120,
  is_active INTEGER DEFAULT 0,  -- 한 번에 하나의 제공자만 활성화
  
  -- 메타데이터
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_validated_at INTEGER,
  
  -- 유효성 검증
  UNIQUE(provider_type)
);

-- LLM 응답 테이블 (메타데이터만, 콘텐츠는 .md 파일)
CREATE TABLE IF NOT EXISTS llm_responses (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  
  -- 제공자 정보
  provider TEXT NOT NULL CHECK(provider IN ('ollama', 'openai', 'azure_openai', 'gemini')),
  model TEXT NOT NULL,
  
  -- 요청 파라미터 (JSON)
  parameters TEXT,  -- 직렬화된 { key: value } 쌍
  
  -- 타이밍
  created_at INTEGER NOT NULL,
  response_time_ms INTEGER,
  
  -- 토큰 사용량
  token_usage_prompt INTEGER,
  token_usage_completion INTEGER,
  token_usage_total INTEGER,
  cost_estimate REAL,  -- USD 단위
  
  -- 상태
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- 저장소
  file_path TEXT NOT NULL,  -- 상대 경로: {prompt-id}/{response-id}.md
  
  -- 오류 처리
  error_code TEXT,
  error_message TEXT
);

-- LLM 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_provider_active ON provider_configurations(is_active) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_llm_responses_prompt_id ON llm_responses(prompt_id);
CREATE INDEX IF NOT EXISTS idx_llm_responses_created_at ON llm_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_responses_status ON llm_responses(status);
CREATE INDEX IF NOT EXISTS idx_llm_responses_provider ON llm_responses(provider);

-- 초기 메타데이터 삽입
INSERT OR IGNORE INTO metadata (key, value) VALUES ('schema_version', '2.0.0');
INSERT OR IGNORE INTO metadata (key, value) VALUES ('created_at', datetime('now'));
INSERT OR IGNORE INTO metadata (key, value) VALUES ('last_updated', datetime('now'));

