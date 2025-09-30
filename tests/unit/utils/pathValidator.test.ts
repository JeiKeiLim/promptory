/**
 * PathValidator 단위 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PathValidator } from '@main/utils/pathValidator';
import { join } from 'path';
import { tmpdir } from 'os';

describe('PathValidator', () => {
  let pathValidator: PathValidator;
  let basePath: string;

  beforeEach(() => {
    basePath = join(tmpdir(), 'test-base');
    pathValidator = new PathValidator(basePath);
  });

  describe('validatePath', () => {
    it('should validate safe paths within base directory', () => {
      const safePath = 'subfolder/file.md';
      const result = pathValidator.validatePath(safePath);
      
      expect(result).toBe(join(basePath, safePath));
    });

    it('should reject directory traversal attempts', () => {
      const maliciousPath = '../../../etc/passwd';
      
      expect(() => {
        pathValidator.validatePath(maliciousPath);
      }).toThrow('directory traversal detected');
    });

    it('should reject absolute paths outside base directory', () => {
      const outsidePath = '/etc/passwd';
      
      expect(() => {
        pathValidator.validatePath(outsidePath);
      }).toThrow('directory traversal detected');
    });

    it('should handle complex traversal attempts', () => {
      const complexPath = 'safe/../../../dangerous';
      
      expect(() => {
        pathValidator.validatePath(complexPath);
      }).toThrow('directory traversal detected');
    });
  });

  describe('validateFileName', () => {
    it('should validate safe file names', () => {
      const safeNames = [
        'normal-file.md',
        'file_with_underscores.txt',
        'file123.md',
        'file.with.dots.md'
      ];

      safeNames.forEach(name => {
        expect(pathValidator.validateFileName(name)).toBe(true);
      });
    });

    it('should reject file names with forbidden characters', () => {
      const dangerousNames = [
        'file<script>.md',
        'file>redirect.md',
        'file:colon.md',
        'file"quote.md',
        'file/slash.md',
        'file\\backslash.md',
        'file|pipe.md',
        'file?question.md',
        'file*asterisk.md'
      ];

      dangerousNames.forEach(name => {
        expect(pathValidator.validateFileName(name)).toBe(false);
      });
    });

    it('should reject reserved Windows file names', () => {
      const reservedNames = [
        'CON.md',
        'PRN.txt',
        'AUX.md',
        'NUL.txt',
        'COM1.md',
        'LPT1.txt'
      ];

      reservedNames.forEach(name => {
        expect(pathValidator.validateFileName(name)).toBe(false);
      });
    });

    it('should reject empty or whitespace-only names', () => {
      const emptyNames = ['', '   ', '\t', '\n'];

      emptyNames.forEach(name => {
        expect(pathValidator.validateFileName(name)).toBe(false);
      });
    });

    it('should reject overly long file names', () => {
      const longName = 'a'.repeat(256) + '.md';
      expect(pathValidator.validateFileName(longName)).toBe(false);
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize file names by replacing forbidden characters', () => {
      const testCases = [
        { input: 'My Awesome Prompt!', expected: 'My-Awesome-Prompt!' },
        { input: 'Code Review: Python/JS', expected: 'Code-Review-Python-JS' },
        { input: 'File<>Name', expected: 'File-Name' },
        { input: '  Multiple   Spaces  ', expected: 'Multiple-Spaces' },
        { input: '---Multiple---Dashes---', expected: 'Multiple-Dashes' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(pathValidator.sanitizeFileName(input)).toBe(expected);
      });
    });

    it('should handle empty or invalid inputs', () => {
      const invalidInputs = ['', '   ', '---'];

      invalidInputs.forEach(input => {
        const result = pathValidator.sanitizeFileName(input);
        expect(result).toBe('untitled');
      });
      
      // '!!!'는 특수문자가 아니므로 그대로 유지됨
      expect(pathValidator.sanitizeFileName('!!!')).toBe('!!!');
    });

    it('should truncate overly long file names', () => {
      const longTitle = 'a'.repeat(300);
      const result = pathValidator.sanitizeFileName(longTitle);
      
      expect(result.length).toBeLessThanOrEqual(250);
      expect(result).toBe('a'.repeat(250));
    });

    it('should preserve valid characters', () => {
      const validTitle = 'Valid-File_Name123.test';
      const result = pathValidator.sanitizeFileName(validTitle);
      
      expect(result).toBe('Valid-File_Name123.test');
    });
  });

  describe('getRelativePath', () => {
    it('should convert absolute paths to relative paths', () => {
      const absolutePath = join(basePath, 'subfolder', 'file.md');
      const result = pathValidator.getRelativePath(absolutePath);
      
      expect(result).toBe(join('subfolder', 'file.md'));
    });

    it('should return original path if not within base path', () => {
      const outsidePath = '/completely/different/path.md';
      const result = pathValidator.getRelativePath(outsidePath);
      
      expect(result).toBe(outsidePath);
    });

    it('should handle base path itself', () => {
      const result = pathValidator.getRelativePath(basePath);
      
      expect(result).toBe('');
    });
  });

  describe('setBasePath and getBasePath', () => {
    it('should update base path correctly', () => {
      const newBasePath = join(tmpdir(), 'new-base');
      pathValidator.setBasePath(newBasePath);
      
      expect(pathValidator.getBasePath()).toBe(newBasePath);
    });

    it('should validate paths against new base path', () => {
      const newBasePath = join(tmpdir(), 'new-base');
      pathValidator.setBasePath(newBasePath);
      
      const testPath = 'test.md';
      const result = pathValidator.validatePath(testPath);
      
      expect(result).toBe(join(newBasePath, testPath));
    });
  });
});
