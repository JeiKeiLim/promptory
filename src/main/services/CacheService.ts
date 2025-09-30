/**
 * SQLite 기반 캐시 서비스
 * 검색 인덱스, 태그 캐시, 설정 캐시 관리
 */

import { Database } from 'sqlite3';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import type { PromptFileInfo, PromptMetadata } from '@shared/types/prompt';

// 검색 인덱스 항목
export interface SearchIndexItem {
  id: string;
  path: string;
  title: string;
  description?: string;
  tags: string; // JSON 문자열
  content: string;
  favorite: number; // SQLite boolean (0/1)
  created_at: string;
  modified_at: string;
  file_size: number;
  parameter_count: number;
  error_status?: string;
}

// 태그 캐시 항목
export interface TagCacheItem {
  name: string;
  count: number;
  last_used: string;
}

export class CacheService {
  private db: Database | null = null;
  private dbPath: string;
  private isInitialized = false;

  constructor(projectPath: string) {
    this.dbPath = join(projectPath, '.promptory', 'cache.db');
  }

  /**
   * 데이터베이스 초기화
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // .promptory 디렉토리 생성
      const cacheDir = dirname(this.dbPath);
      await fs.mkdir(cacheDir, { recursive: true });

      // 데이터베이스 연결
      await this.connect();

      // 스키마 초기화
      await this.initializeSchema();

      this.isInitialized = true;
      console.log('Cache service initialized:', this.dbPath);
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 연결
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 스키마 초기화
   */
  private async initializeSchema(): Promise<void> {
    const schema = `
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

-- 초기 메타데이터 삽입
INSERT OR IGNORE INTO metadata (key, value) VALUES ('schema_version', '1.0.0');
INSERT OR IGNORE INTO metadata (key, value) VALUES ('created_at', datetime('now'));
INSERT OR IGNORE INTO metadata (key, value) VALUES ('last_updated', datetime('now'));
    `;
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.exec(schema, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 검색 인덱스에 파일 추가/업데이트
   */
  async upsertSearchIndex(fileInfo: PromptFileInfo, content: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const indexItem: SearchIndexItem = {
      id: fileInfo.id,
      path: fileInfo.path,
      title: fileInfo.metadata.title,
      description: fileInfo.metadata.description || undefined,
      tags: JSON.stringify(fileInfo.metadata.tags),
      content: content,
      favorite: fileInfo.metadata.favorite ? 1 : 0,
      created_at: fileInfo.metadata.created_at,
      modified_at: fileInfo.modifiedAt,
      file_size: fileInfo.fileSize,
      parameter_count: fileInfo.metadata.parameters.length,
      error_status: fileInfo.error?.type || undefined
    };

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO search_index (
          id, path, title, description, tags, content, favorite,
          created_at, modified_at, file_size, parameter_count, error_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db!.run(sql, [
        indexItem.id,
        indexItem.path,
        indexItem.title,
        indexItem.description,
        indexItem.tags,
        indexItem.content,
        indexItem.favorite,
        indexItem.created_at,
        indexItem.modified_at,
        indexItem.file_size,
        indexItem.parameter_count,
        indexItem.error_status
      ], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 검색 인덱스에서 파일 제거
   */
  async removeFromSearchIndex(fileId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM search_index WHERE id = ?', [fileId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 검색 인덱스 전체 조회
   */
  async getAllSearchIndex(): Promise<SearchIndexItem[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM search_index ORDER BY modified_at DESC', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as SearchIndexItem[]);
        }
      });
    });
  }

  /**
   * FTS를 사용한 전문 검색
   */
  async searchFullText(query: string, limit: number = 100): Promise<SearchIndexItem[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT si.* FROM search_index si
        JOIN search_fts fts ON si.id = fts.id
        WHERE search_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `;

      this.db!.all(sql, [query, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as SearchIndexItem[]);
        }
      });
    });
  }

  /**
   * 태그 캐시 업데이트
   */
  async updateTagCache(tags: string[]): Promise<void> {
    if (!this.db || tags.length === 0) {
      return;
    }

    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      this.db!.serialize(() => {
        this.db!.run('BEGIN TRANSACTION');

        let completed = 0;
        let hasError = false;

        tags.forEach(tag => {
          this.db!.run(`
            INSERT OR REPLACE INTO tags (name, count, last_used)
            VALUES (?, COALESCE((SELECT count FROM tags WHERE name = ?), 0) + 1, ?)
          `, [tag, tag, now], (err) => {
            if (err && !hasError) {
              hasError = true;
              this.db!.run('ROLLBACK');
              reject(err);
              return;
            }

            completed++;
            if (completed === tags.length && !hasError) {
              this.db!.run('COMMIT', (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }
          });
        });
      });
    });
  }

  /**
   * 태그 목록 조회
   */
  async getAllTags(): Promise<TagCacheItem[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT * FROM tags ORDER BY count DESC, last_used DESC',
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows as TagCacheItem[]);
          }
        }
      );
    });
  }

  /**
   * 태그 자동완성 조회
   */
  async getTagSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT name FROM tags WHERE name LIKE ? ORDER BY count DESC LIMIT ?',
        [`%${query}%`, limit],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve((rows as { name: string }[]).map(row => row.name));
          }
        }
      );
    });
  }

  /**
   * 설정 저장
   */
  async setConfig(key: string, value: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const now = new Date().toISOString();
    const valueStr = JSON.stringify(value);

    return new Promise((resolve, reject) => {
      this.db!.run(
        'INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)',
        [key, valueStr, now],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * 설정 조회
   */
  async getConfig(key: string): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.get(
        'SELECT value FROM config WHERE key = ?',
        [key],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            try {
              resolve(JSON.parse((row as { value: string }).value));
            } catch (parseErr) {
              reject(parseErr);
            }
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * 캐시 통계 조회
   */
  async getCacheStats(): Promise<{
    totalFiles: number;
    totalTags: number;
    dbSize: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.serialize(() => {
        let totalFiles = 0;
        let totalTags = 0;

        this.db!.get('SELECT COUNT(*) as count FROM search_index', (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          totalFiles = (row as { count: number }).count;

          this.db!.get('SELECT COUNT(*) as count FROM tags', (err, row) => {
            if (err) {
              reject(err);
              return;
            }
            totalTags = (row as { count: number }).count;

            // 파일 크기 조회
            fs.stat(this.dbPath).then(stats => {
              resolve({
                totalFiles,
                totalTags,
                dbSize: stats.size
              });
            }).catch(reject);
          });
        });
      });
    });
  }

  /**
   * 데이터베이스 연결 종료
   */
  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.db = null;
            this.isInitialized = false;
            resolve();
          }
        });
      });
    }
  }

  /**
   * 프로젝트 경로 변경
   */
  async switchProject(newProjectPath: string): Promise<void> {
    // 기존 연결 종료
    await this.close();
    
    // 새 경로 설정
    this.dbPath = join(newProjectPath, '.promptory', 'cache.db');
    
    // 재초기화
    await this.initialize();
  }
}
