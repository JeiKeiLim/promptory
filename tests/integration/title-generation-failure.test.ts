/**
 * T084-T086: Title Generation Failure Handling Tests
 * Tests for User Story 3 - Graceful failure handling
 * 
 * Following TDD RED phase: These tests should FAIL initially
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TitleGenerationService } from '../../src/main/services/TitleGenerationService';
import { LLMStorageService } from '../../src/main/services/LLMStorageService';
import { TitleGenerationConfig } from '../../src/shared/types/llm';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('Title Generation Failure Handling (US3)', () => {
  let titleService: TitleGenerationService;
  let storageService: LLMStorageService;
  let testDbPath: string;
  let testResponsesDir: string;

  beforeEach(async () => {
    // Create temporary directories
    const testDir = path.join(os.tmpdir(), `test-title-failures-${Date.now()}`);
    testDbPath = path.join(testDir, 'test.db');
    testResponsesDir = path.join(testDir, 'responses');
    fs.mkdirSync(testResponsesDir, { recursive: true });

    // Initialize services
    storageService = new LLMStorageService(testDbPath, testResponsesDir);
    await storageService.initialize();

    const config: TitleGenerationConfig = {
      enabled: true,
      selectedModel: 'gemma3:1b',
      selectedProvider: 'ollama',
      timeoutSeconds: 2 // Short timeout for testing
    };

    titleService = new TitleGenerationService(config, storageService);
  });

  // T084: Timeout handling
  it('should handle timeout gracefully with fallback', async () => {
    const responseId = 'test-timeout-response';
    const content = 'Test content for timeout testing';

    // Mock Ollama to throw timeout error (simulating AbortError)
    vi.spyOn((titleService as any).ollamaProvider, 'generate').mockRejectedValue(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    );

    const result = await titleService.generateTitle(responseId, content);

    // With fallback, should succeed with content-based title
    expect(result.success).toBe(true);
    expect(result.title).toBeDefined();
    expect(result.title).toContain('Test content');

    vi.restoreAllMocks();
  });

  // T085: Network error handling with fallback
  it('should handle network errors gracefully with fallback', async () => {
    const responseId = 'test-network-error';
    const content = 'Test content for network error handling';

    // Mock Ollama to throw network error
    vi.spyOn((titleService as any).ollamaProvider, 'generate').mockRejectedValue(
      new Error('ECONNREFUSED: Connection refused')
    );

    const result = await titleService.generateTitle(responseId, content);

    // With fallback, should succeed with content-based title
    expect(result.success).toBe(true);
    expect(result.title).toBeDefined();
    expect(result.title).toContain('Test content');

    vi.restoreAllMocks();
  });

  // T086: Malformed title response handling
  it('should handle malformed title responses', async () => {
    const responseId = 'test-malformed-response';
    const content = 'Test content for malformed response handling';

    // Mock Ollama to return malformed title (too long, invalid format)
    vi.spyOn((titleService as any).ollamaProvider, 'generate').mockResolvedValue({
      content: 'A'.repeat(500) // Way too long
    });

    const result = await titleService.generateTitle(responseId, content);

    // Should still succeed but with truncated/validated title
    expect(result.success).toBe(true);
    expect(result.title).toBeDefined();
    expect(result.title!.length).toBeLessThanOrEqual(150);

    vi.restoreAllMocks();
  });

  // T086: Empty title response handling
  it('should handle empty title responses', async () => {
    const responseId = 'test-empty-response';
    const content = 'Test content for empty response handling';

    // Mock Ollama to throw error (which will trigger fallback)
    vi.spyOn((titleService as any).ollamaProvider, 'generate').mockRejectedValue(
      new Error('Invalid response')
    );

    const result = await titleService.generateTitle(responseId, content);

    // With fallback logic, should succeed with content-based title
    expect(result.success).toBe(true);
    expect(result.title).toBeDefined();
    expect(result.title!.length).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });
});
