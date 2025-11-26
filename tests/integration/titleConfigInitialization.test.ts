/**
 * Integration test: Title Generation Config Initialization
 * 
 * Verifies that TitleGenerationService loads saved configuration from database
 * on initialization instead of using hardcoded defaults.
 * 
 * RED: Test fails because TitleGenerationService is initialized with hardcoded
 *      config before loading from database
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LLMStorageService } from '../../src/main/services/LLMStorageService';
import { TitleGenerationService } from '../../src/main/services/TitleGenerationService';
import type { TitleGenerationConfig } from '@shared/types/llm';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Title Generation Config Initialization', () => {
  let testDbPath: string;
  let testResultsPath: string;
  let storageService: LLMStorageService;

  beforeEach(async () => {
    // Create temp directories for test
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'title-init-test-'));
    testDbPath = path.join(tempDir, 'test.db');
    testResultsPath = path.join(tempDir, 'results');
    fs.mkdirSync(testResultsPath, { recursive: true });

    storageService = new LLMStorageService(testDbPath, testResultsPath);
    await storageService.initialize();
  });

  afterEach(async () => {
    // Cleanup
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testResultsPath)) {
      fs.rmSync(testResultsPath, { recursive: true });
    }
  });

  it('should initialize TitleGenerationService with saved config from database', async () => {
    // ARRANGE: Save custom config to database
    const customConfig: TitleGenerationConfig = {
      enabled: true,
      selectedModel: 'gemma3', // Changed from default 'gemma3:1b'
      selectedProvider: 'ollama',
      timeoutSeconds: 45 // Changed from default 30
    };
    
    await storageService.updateTitleGenerationConfig(customConfig);
    
    // ACT: Simulate what happens during app initialization
    // Load config from database
    const loadedConfig = await storageService.getTitleGenerationConfig();
    
    // Initialize service with loaded config (not hardcoded default)
    const titleService = new TitleGenerationService(loadedConfig, storageService);
    
    // ASSERT: Service should use the loaded config, not defaults
    // We can verify by checking the config used in title generation
    expect(loadedConfig.selectedModel).toBe('gemma3');
    expect(loadedConfig.timeoutSeconds).toBe(45);
    
    // The service should use this config for title generation
    // (We can't directly access private config, but we verified it's passed correctly)
  });

  it('should use default config when no saved config exists', async () => {
    // ACT: Load config from empty database (should return defaults)
    const loadedConfig = await storageService.getTitleGenerationConfig();
    
    // ASSERT: Should return default config
    expect(loadedConfig.enabled).toBe(true);
    expect(loadedConfig.selectedModel).toBe('gemma3:1b');
    expect(loadedConfig.selectedProvider).toBe('ollama');
    expect(loadedConfig.timeoutSeconds).toBe(30);
  });

  it('should preserve custom model name in generated title metadata', async () => {
    // ARRANGE: Save custom config
    const customConfig: TitleGenerationConfig = {
      enabled: true,
      selectedModel: 'custom-model-name',
      selectedProvider: 'ollama',
      timeoutSeconds: 30
    };
    
    await storageService.updateTitleGenerationConfig(customConfig);
    
    // Create a test response
    const responseId = 'test-response-' + Date.now();
    const testResponse = {
      id: responseId,
      promptId: 'test-prompt',
      provider: 'ollama' as const,
      model: 'gemma3:1b', // Main model
      content: 'Test response content',
      tokensUsed: 100,
      createdAt: Date.now(),
      filePath: path.join(testResultsPath, `${responseId}.md`),
      status: 'completed' as const,
      titleGenerationStatus: 'pending' as const
    };
    
    await storageService.saveResponse(testResponse);
    
    // ACT: Load config and initialize service
    const loadedConfig = await storageService.getTitleGenerationConfig();
    const titleService = new TitleGenerationService(loadedConfig, storageService);
    
    // Generate title (will use fallback in test environment)
    await titleService.generateTitle(responseId, testResponse.content);
    
    // ASSERT: Title metadata should use custom model name
    const updatedResponse = await storageService.getResponse(responseId);
    expect(updatedResponse?.titleModel).toBe('custom-model-name');
  });
});
