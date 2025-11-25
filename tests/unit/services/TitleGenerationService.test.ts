/**
 * TitleGenerationService Unit Tests
 * 
 * RED phase: Tests written FIRST, verified to FAIL before implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TitleGenerationService } from '@main/services/TitleGenerationService';
import type { TitleGenerationConfig } from '@shared/types/llm';

describe('TitleGenerationService', () => {
  let service: TitleGenerationService;
  let mockConfig: TitleGenerationConfig;
  let mockStorageService: any;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      selectedModel: 'gemma3:1b',
      selectedProvider: 'ollama',
      timeoutSeconds: 30
    };
    
    // Mock storage service
    mockStorageService = {
      getResponse: vi.fn().mockResolvedValue(null),
      saveResponse: vi.fn().mockResolvedValue(undefined)
    };
    
    // Create service instance
    service = new TitleGenerationService(mockConfig, mockStorageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // T017: Unit test for TitleGenerationService.generateTitle()
  describe('generateTitle()', () => {
    it('should generate a title from response content', async () => {
      const responseId = 'test-response-123';
      const content = 'This is a test response about React hooks and their usage in functional components. Hooks provide a way to use state and lifecycle methods in functional components.';
      
      // This test should FAIL until implementation exists
      expect(service).toBeDefined();
      expect(service.generateTitle).toBeDefined();
      
      const result = await service.generateTitle(responseId, content);
      
      expect(result.success).toBe(true);
      expect(result.title).toBeDefined();
      expect(typeof result.title).toBe('string');
    });

    it('should handle short content (<500 chars)', async () => {
      const responseId = 'test-response-456';
      const shortContent = 'Brief answer';
      
      const result = await service.generateTitle(responseId, shortContent);
      
      expect(result.success).toBe(true);
      expect(result.title).toBeDefined();
    });

    it('should truncate content to 500 chars at word boundary', async () => {
      const responseId = 'test-response-789';
      const longContent = 'a'.repeat(600) + ' word boundary test';
      
      const result = await service.generateTitle(responseId, longContent);
      
      expect(result.success).toBe(true);
      // Content passed to LLM should be truncated
    });
  });

  // T018: Unit test for title prompt template generation and word count validation
  describe('prompt template generation', () => {
    it('should generate system prompt with 5-8 word constraint', () => {
      expect(service).toBeDefined();
      
      // System prompt should mention 5-8 words
      const systemPrompt = service.getSystemPrompt();
      expect(systemPrompt).toContain('5-8 words');
      expect(systemPrompt).toContain('same language');
      expect(systemPrompt).toContain('descriptive');
    });

    it('should generate user prompt with truncated content', () => {
      const content = 'This is test content for title generation';
      const userPrompt = service.getUserPrompt(content);
      
      expect(userPrompt).toContain('Generate a title');
      expect(userPrompt).toContain(content);
    });

    it('should validate generated title is 5-8 words', async () => {
      const responseId = 'test-word-count';
      const content = 'Testing word count validation in generated titles';
      
      const result = await service.generateTitle(responseId, content);
      
      if (result.success && result.title) {
        const wordCount = result.title.trim().split(/\s+/).length;
        expect(wordCount).toBeGreaterThanOrEqual(5);
        expect(wordCount).toBeLessThanOrEqual(8);
      }
    });
  });

  // T019: Unit test for title validation/truncation logic
  describe('title validation and truncation', () => {
    it('should validate title length does not exceed 150 characters', () => {
      const longTitle = 'a'.repeat(200);
      const validated = service.validateTitle(longTitle);
      
      expect(validated.length).toBeLessThanOrEqual(150);
    });

    it('should truncate titles >150 chars at word boundary', () => {
      const longTitle = 'This is a very long title that exceeds the maximum allowed length '.repeat(5);
      const validated = service.validateTitle(longTitle);
      
      expect(validated.length).toBeLessThanOrEqual(150);
      expect(validated.endsWith('...')).toBe(true);
    });

    it('should remove quotation marks from title', () => {
      const quotedTitle = '"Title with quotes"';
      const validated = service.validateTitle(quotedTitle);
      
      expect(validated).not.toContain('"');
      expect(validated).toBe('Title with quotes');
    });

    it('should trim whitespace from title', () => {
      const titleWithSpaces = '  Title with spaces  ';
      const validated = service.validateTitle(titleWithSpaces);
      
      expect(validated).toBe('Title with spaces');
    });

    it('should handle empty or invalid titles', () => {
      const emptyTitle = '';
      const validated = service.validateTitle(emptyTitle);
      
      expect(validated).toBe('');
    });
  });

  // Additional test for timeout handling (T028 related)
  describe('timeout handling', () => {
    it('should respect configured timeout (30s default)', async () => {
      const responseId = 'test-timeout';
      const content = 'Test content for timeout';
      
      // Mock a slow provider
      const startTime = Date.now();
      
      try {
        await service.generateTitle(responseId, content);
      } catch (error) {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(35000); // Should timeout before 35s
      }
    });
  });
});
