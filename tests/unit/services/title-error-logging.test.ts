/**
 * T087: Error Logging Tests
 * Tests that errors are logged properly without user-facing disruptions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TitleGenerationService } from '@main/services/TitleGenerationService';
import type { TitleGenerationConfig } from '@shared/types/llm';

describe('Title Generation Error Logging (US3)', () => {
  let mockStorageService: any;
  let config: TitleGenerationConfig;

  beforeEach(() => {
    mockStorageService = {
      getResponse: vi.fn().mockResolvedValue(null),
      saveResponse: vi.fn().mockResolvedValue(undefined)
    };

    config = {
      enabled: true,
      selectedModel: 'gemma3:1b',
      selectedProvider: 'ollama',
      timeoutSeconds: 30
    };
  });

  it('should log warnings for provider errors with fallback', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const service = new TitleGenerationService(config, mockStorageService);

    // Mock provider to throw error (triggers fallback)
    vi.spyOn((service as any).ollamaProvider, 'generate').mockRejectedValue(
      new Error('Test error for logging')
    );

    const result = await service.generateTitle('test-id', 'Test content for title');

    // Should log warning
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Title Generation]'),
      expect.any(Error)
    );

    // Should still succeed with fallback
    expect(result.success).toBe(true);
    expect(result.title).toBeDefined();

    consoleWarnSpy.mockRestore();
  });

  it('should not throw errors to user-facing code', async () => {
    const service = new TitleGenerationService(config, mockStorageService);

    // Mock provider to throw various errors
    vi.spyOn((service as any).ollamaProvider, 'generate').mockRejectedValue(
      new Error('Network connection failed')
    );

    // Should not throw
    await expect(
      service.generateTitle('test-id', 'Test content')
    ).resolves.toBeDefined();
  });
});
