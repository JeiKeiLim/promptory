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

-- 초기 메타데이터 삽입
INSERT OR IGNORE INTO metadata (key, value) VALUES ('schema_version', '1.0.0');
INSERT OR IGNORE INTO metadata (key, value) VALUES ('created_at', datetime('now'));
INSERT OR IGNORE INTO metadata (key, value) VALUES ('last_updated', datetime('now'));

