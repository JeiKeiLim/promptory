/**
 * FileService 단위 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileService } from '@main/services/FileService';
import type { PromptMetadata } from '@shared/types/prompt';

// CacheService 모킹
vi.mock('@main/services/CacheService', () => ({
  CacheService: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    upsertSearchIndex: vi.fn().mockResolvedValue(undefined),
    updateTagCache: vi.fn().mockResolvedValue(undefined),
    deleteSearchIndex: vi.fn().mockResolvedValue(undefined),
    searchPrompts: vi.fn().mockResolvedValue([]),
    getAllTags: vi.fn().mockResolvedValue([]),
    switchProject: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('FileService', () => {
  let fileService: FileService;
  let tempDir: string;

  beforeEach(async () => {
    // 임시 디렉토리 생성
    tempDir = await fs.mkdtemp(join(tmpdir(), 'promptory-test-'));
    fileService = new FileService(tempDir);
  });

  afterEach(async () => {
    // 임시 디렉토리 정리
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  });

  describe('createFile', () => {
    it('should create a new prompt file with valid metadata', async () => {
      const metadata: PromptMetadata = {
        title: 'Test Prompt',
        description: 'A test prompt',
        tags: ['test'],
        favorite: false,
        created_at: new Date().toISOString(),
        parameters: []
      };

      const result = await fileService.createFile({
        metadata,
        content: 'Test content'
      });

      expect(result).toBe('Test-Prompt.md');
      
      // 파일이 실제로 생성되었는지 확인
      const filePath = join(tempDir, result);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      // 파일 내용 확인
      const fileContent = await fs.readFile(filePath, 'utf-8');
      expect(fileContent).toContain('title: Test Prompt');
      expect(fileContent).toContain('Test content');
    });

    it('should sanitize file names with special characters', async () => {
      const metadata: PromptMetadata = {
        title: 'Test/Prompt<>With|Special*Characters',
        tags: [],
        favorite: false,
        created_at: new Date().toISOString(),
        parameters: []
      };

      const result = await fileService.createFile({
        metadata,
        content: 'Test content'
      });

      expect(result).toBe('Test-Prompt-With-Special-Characters.md');
    });

    it('should throw error for duplicate file names', async () => {
      const metadata: PromptMetadata = {
        title: 'Duplicate Test',
        tags: [],
        favorite: false,
        created_at: new Date().toISOString(),
        parameters: []
      };

      // 첫 번째 파일 생성
      await fileService.createFile({
        metadata,
        content: 'First content'
      });

      // 같은 제목으로 두 번째 파일 생성 시도
      await expect(fileService.createFile({
        metadata,
        content: 'Second content'
      })).rejects.toThrow('already exists');
    });
  });

  describe('readFile', () => {
    it('should read and parse a valid prompt file', async () => {
      // 테스트 파일 생성
      const testContent = `---
title: "Read Test"
description: "Test description"
tags: ["test", "read"]
favorite: true
created_at: "2024-01-01T00:00:00Z"
parameters:
  - name: "testParam"
    type: "string"
    required: true
---

# Test Content

This is a test prompt.`;

      const testFilePath = join(tempDir, 'read-test.md');
      await fs.writeFile(testFilePath, testContent, 'utf-8');

      const result = await fileService.readFile('read-test.md');

      expect(result.metadata.title).toBe('Read Test');
      expect(result.metadata.description).toBe('Test description');
      expect(result.metadata.tags).toEqual(['test', 'read']);
      expect(result.metadata.favorite).toBe(true);
      expect(result.metadata.parameters).toHaveLength(1);
      expect(result.metadata.parameters[0].name).toBe('testParam');
      expect(result.content).toContain('# Test Content');
    });

    it('should throw error for non-existent file', async () => {
      await expect(fileService.readFile('non-existent.md')).rejects.toThrow();
    });
  });

  describe('listFiles', () => {
    it('should return empty array for empty directory', async () => {
      const result = await fileService.listFiles();
      expect(result).toEqual([]);
    });

    it('should list all markdown files in directory', async () => {
      // 테스트 파일들 생성
      const files = [
        { name: 'test1.md', title: 'Test 1' },
        { name: 'test2.md', title: 'Test 2' },
        { name: 'not-markdown.txt', title: 'Not Markdown' } // 이 파일은 무시되어야 함
      ];

      for (const file of files) {
        if (file.name.endsWith('.md')) {
          const content = `---
title: "${file.title}"
tags: []
favorite: false
created_at: "2024-01-01T00:00:00Z"
parameters: []
---

Content for ${file.title}`;
          await fs.writeFile(join(tempDir, file.name), content, 'utf-8');
        } else {
          await fs.writeFile(join(tempDir, file.name), 'Not a markdown file', 'utf-8');
        }
      }

      const result = await fileService.listFiles();
      
      expect(result).toHaveLength(2);
      expect(result.map(f => f.metadata.title)).toContain('Test 1');
      expect(result.map(f => f.metadata.title)).toContain('Test 2');
    });
  });
});
