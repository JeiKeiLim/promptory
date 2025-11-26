/**
 * Title Generation IPC Handlers Integration Tests
 * 
 * Tests IPC communication for title generation configuration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LLMStorageService } from '@main/services/LLMStorageService';
import { TitleGenerationConfig } from '@shared/types/llm';
import fs from 'fs';
import path from 'path';

describe('Title Generation IPC Handlers', () => {
  const testDbPath = path.join(__dirname, 'test-title-config.db');
  const testResultsPath = path.join(__dirname, 'test-results');
  let storageService: LLMStorageService;

  beforeEach(async () => {
    // Clean up
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testResultsPath)) {
      fs.rmSync(testResultsPath, { recursive: true, force: true });
    }

    // Initialize
    storageService = new LLMStorageService(testDbPath, testResultsPath);
    await storageService.initialize();
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testResultsPath)) {
      fs.rmSync(testResultsPath, { recursive: true, force: true });
    }
  });

  // T060: Test llm:title:config:get IPC handler
  describe('getTitleGenerationConfig', () => {
    it('should return default config when none exists', async () => {
      const config = await storageService.getTitleGenerationConfig();
      
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true); // Default enabled
      expect(config.timeoutSeconds).toBe(30); // Default timeout
      expect(config.selectedModel).toBeDefined();
      expect(config.selectedProvider).toBeDefined();
    });

    it('should return saved config', async () => {
      const testConfig: TitleGenerationConfig = {
        enabled: false,
        selectedModel: 'gpt-3.5-turbo',
        selectedProvider: 'openai',
        timeoutSeconds: 60
      };

      await storageService.updateTitleGenerationConfig(testConfig);
      const retrieved = await storageService.getTitleGenerationConfig();

      expect(retrieved.enabled).toBe(false);
      expect(retrieved.selectedModel).toBe('gpt-3.5-turbo');
      expect(retrieved.selectedProvider).toBe('openai');
      expect(retrieved.timeoutSeconds).toBe(60);
    });
  });

  // T061: Test llm:title:config:set IPC handler with validation
  describe('updateTitleGenerationConfig', () => {
    it('should save valid config', async () => {
      const config: TitleGenerationConfig = {
        enabled: true,
        selectedModel: 'gemma3:1b',
        selectedProvider: 'ollama',
        timeoutSeconds: 45
      };

      await storageService.updateTitleGenerationConfig(config);
      const retrieved = await storageService.getTitleGenerationConfig();

      expect(retrieved.enabled).toBe(true);
      expect(retrieved.selectedModel).toBe('gemma3:1b');
      expect(retrieved.timeoutSeconds).toBe(45);
    });

    // T062: Test timeout validation (10-120 seconds)
    it('should reject timeout < 10 seconds', async () => {
      const config: TitleGenerationConfig = {
        enabled: true,
        selectedModel: 'gemma3:1b',
        selectedProvider: 'ollama',
        timeoutSeconds: 5 // Invalid
      };

      await expect(
        storageService.updateTitleGenerationConfig(config)
      ).rejects.toThrow(/timeout.*10.*120/i);
    });

    it('should reject timeout > 120 seconds', async () => {
      const config: TitleGenerationConfig = {
        enabled: true,
        selectedModel: 'gemma3:1b',
        selectedProvider: 'ollama',
        timeoutSeconds: 150 // Invalid
      };

      await expect(
        storageService.updateTitleGenerationConfig(config)
      ).rejects.toThrow(/timeout.*10.*120/i);
    });

    it('should accept timeout at boundaries (10 and 120)', async () => {
      const config10: TitleGenerationConfig = {
        enabled: true,
        selectedModel: 'gemma3:1b',
        selectedProvider: 'ollama',
        timeoutSeconds: 10
      };

      const config120: TitleGenerationConfig = {
        enabled: true,
        selectedModel: 'gemma3:1b',
        selectedProvider: 'ollama',
        timeoutSeconds: 120
      };

      await expect(
        storageService.updateTitleGenerationConfig(config10)
      ).resolves.not.toThrow();

      await expect(
        storageService.updateTitleGenerationConfig(config120)
      ).resolves.not.toThrow();
    });
  });

  // T063: Test enable/disable toggle affecting title generation
  describe('enable/disable toggle', () => {
    it('should persist enabled state', async () => {
      // Disable
      await storageService.updateTitleGenerationConfig({
        enabled: false,
        selectedModel: 'gemma3:1b',
        selectedProvider: 'ollama',
        timeoutSeconds: 30
      });

      let config = await storageService.getTitleGenerationConfig();
      expect(config.enabled).toBe(false);

      // Re-enable
      await storageService.updateTitleGenerationConfig({
        enabled: true,
        selectedModel: 'gemma3:1b',
        selectedProvider: 'ollama',
        timeoutSeconds: 30
      });

      config = await storageService.getTitleGenerationConfig();
      expect(config.enabled).toBe(true);
    });
  });
});
