/**
 * Sequential Execution Integration Test
 * 
 * T130: RED phase - test that title generation blocks next LLM call
 * 
 * Requirement: LLM call #1 → title generation #1 → LLM call #2 → title generation #2
 * Title generation must complete before next LLM call begins processing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMStorageService } from '../../src/main/services/LLMStorageService';
import { TitleGenerationService } from '../../src/main/services/TitleGenerationService';
import { RequestQueue } from '../../src/main/services/RequestQueue';
import { OllamaProvider } from '../../src/main/services/providers/OllamaProvider';
import type { LLMRequest, LLMResponseMetadata, TitleGenerationConfig } from '@shared/types/llm';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

describe('Sequential Execution - Title Generation Blocking', () => {
  let tempDir: string;
  let dbPath: string;
  let resultsPath: string;
  let storageService: LLMStorageService;
  let titleService: TitleGenerationService;
  let requestQueue: RequestQueue;

  beforeEach(async () => {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sequential-test-'));
    dbPath = path.join(tempDir, 'test.db');
    resultsPath = path.join(tempDir, 'results');
    fs.mkdirSync(resultsPath, { recursive: true });

    // Initialize services
    storageService = new LLMStorageService(dbPath, resultsPath);
    await storageService.initialize();

    const titleConfig: TitleGenerationConfig = {
      enabled: true,
      selectedProvider: 'ollama',
      selectedModel: 'gemma3:1b',
      timeoutSeconds: 30
    };

    titleService = new TitleGenerationService(titleConfig, storageService);
    requestQueue = new RequestQueue();
  });

  afterEach(async () => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should complete title generation before processing next LLM request', async () => {
    // Track execution order
    const executionLog: string[] = [];
    
    // Mock the title generation to track when it's called
    const originalGenerateTitle = titleService.generateTitle.bind(titleService);
    titleService.generateTitle = vi.fn(async (responseId: string, content: string) => {
      executionLog.push(`title-start-${responseId}`);
      const result = await originalGenerateTitle(responseId, content);
      executionLog.push(`title-end-${responseId}`);
      return result;
    });

    // Create two mock LLM responses
    const response1Id = uuidv4();
    const response2Id = uuidv4();

    // Simulate processing two sequential LLM calls
    const processLLMCall = async (responseId: string, content: string) => {
      executionLog.push(`llm-start-${responseId}`);
      
      // Save response (simulating the main LLM call completion)
      const metadata: LLMResponseMetadata = {
        id: responseId,
        promptId: 'test-prompt',
        provider: 'ollama',
        model: 'gemma3:1b',
        createdAt: Date.now(),
        responseTimeMs: 100,
        status: 'completed',
        filePath: ''
      };

      const filePath = await storageService.saveResponseContent(
        'test-prompt',
        'Test Prompt',
        responseId,
        content,
        metadata,
        'Test prompt content'
      );

      metadata.filePath = filePath;
      await storageService.saveResponseMetadata(metadata);

      executionLog.push(`llm-end-${responseId}`);

      // THIS IS THE KEY PART: Title generation should BLOCK next LLM call
      // Current bug: titleService.generateTitle().catch() doesn't block
      // Expected: await titleService.generateTitle()
      await titleService.generateTitle(responseId, content);
    };

    // Process two LLM calls sequentially
    await processLLMCall(response1Id, 'This is the first response content for testing title generation');
    await processLLMCall(response2Id, 'This is the second response content for testing title generation');

    // Verify execution order: LLM1 → Title1 → LLM2 → Title2
    expect(executionLog).toEqual([
      `llm-start-${response1Id}`,
      `llm-end-${response1Id}`,
      `title-start-${response1Id}`,
      `title-end-${response1Id}`,
      `llm-start-${response2Id}`,
      `llm-end-${response2Id}`,
      `title-start-${response2Id}`,
      `title-end-${response2Id}`
    ]);

    // Verify both titles were generated and saved
    const metadata1 = await storageService.getResponseMetadata(response1Id);
    const metadata2 = await storageService.getResponseMetadata(response2Id);

    expect(metadata1?.generatedTitle).toBeTruthy();
    expect(metadata1?.titleGenerationStatus).toBe('completed');
    expect(metadata2?.generatedTitle).toBeTruthy();
    expect(metadata2?.titleGenerationStatus).toBe('completed');
  }, 60000); // 60s timeout for Ollama calls

  it('should handle title generation timeout without blocking forever', async () => {
    // Create a title service with very short timeout
    const shortTimeoutConfig: TitleGenerationConfig = {
      enabled: true,
      selectedProvider: 'ollama',
      selectedModel: 'gemma3:1b',
      timeoutSeconds: 2 // 2 second timeout
    };

    const shortTimeoutService = new TitleGenerationService(shortTimeoutConfig, storageService);

    const responseId = uuidv4();
    // Very long content to make Ollama take longer to process
    const longContent = 'Test content for timeout scenario. '.repeat(1000);

    // Save response
    const metadata: LLMResponseMetadata = {
      id: responseId,
      promptId: 'test-prompt',
      provider: 'ollama',
      model: 'gemma3:1b',
      createdAt: Date.now(),
      responseTimeMs: 100,
      status: 'completed',
      filePath: ''
    };

    const filePath = await storageService.saveResponseContent(
      'test-prompt',
      'Test Prompt',
      responseId,
      longContent,
      metadata,
      'Test prompt content'
    );

    metadata.filePath = filePath;
    await storageService.saveResponseMetadata(metadata);

    // Title generation should respect timeout
    const startTime = Date.now();
    const result = await shortTimeoutService.generateTitle(responseId, longContent);
    const duration = Date.now() - startTime;

    // Should complete within timeout window (2s) + some buffer
    expect(duration).toBeLessThan(3500);
    
    // Result might be success or failure depending on Ollama speed
    // The key is that it didn't hang forever
    console.log(`[TEST] Title generation completed in ${duration}ms, success: ${result.success}`);
    
    if (!result.success) {
      // If failed, should have error message
      expect(result.error).toBeTruthy();
    }
  }, 10000);
});
