/**
 * FULL END-TO-END TEST - LLM Integration
 * Tests the complete flow: Save Provider → Validate → Call LLM → Save Response
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { LLMStorageService } from '@main/services/LLMStorageService';
import { CredentialService } from '@main/services/CredentialService';
import { ParameterSubstitutionService } from '@main/services/ParameterSubstitutionService';
import { RequestQueue } from '@main/services/RequestQueue';
import { TokenCounter } from '@main/services/TokenCounter';
import { OllamaProvider } from '@main/services/providers/OllamaProvider';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import Database from 'better-sqlite3';
import type { LLMProviderConfig, LLMRequest, LLMResponseMetadata } from '@shared/types/llm';

describe('LLM Full Flow E2E Test', () => {
  let tempDir: string;
  let dbPath: string;
  let resultsPath: string;
  let storageService: LLMStorageService;
  let credentialService: CredentialService;
  let parameterService: ParameterSubstitutionService;
  let requestQueue: RequestQueue;
  let tokenCounter: TokenCounter;
  let provider: OllamaProvider;
  let savedProviderId: string;

  beforeAll(async () => {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-test-'));
    dbPath = path.join(tempDir, 'test.db');
    resultsPath = path.join(tempDir, 'llm_results');

    console.log('[E2E TEST] Temp dir:', tempDir);

    // Initialize services
    storageService = new LLMStorageService(dbPath, resultsPath);
    await storageService.initialize();
    
    credentialService = new CredentialService();
    parameterService = new ParameterSubstitutionService();
    requestQueue = new RequestQueue();
    tokenCounter = new TokenCounter();
    provider = new OllamaProvider('http://localhost:11434');
  });

  afterAll(async () => {
    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log('[E2E TEST] Cleaned up temp dir');
    } catch (error) {
      console.error('[E2E TEST] Cleanup failed:', error);
    }
  });

  it('STEP 1: Should save Ollama provider configuration', async () => {
    const config: LLMProviderConfig = {
      id: 'test-provider-' + Date.now(),
      providerType: 'ollama',
      displayName: 'Test Ollama',
      baseUrl: 'http://localhost:11434',
      modelName: 'gemma3:1b',
      timeoutSeconds: 120,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    console.log('[E2E TEST] Saving provider config:', config.id);
    await storageService.saveProviderConfig(config);
    savedProviderId = config.id;

    const retrieved = await storageService.getProviderConfig(config.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.providerType).toBe('ollama');
    expect(retrieved?.baseUrl).toBe('http://localhost:11434');
    
    console.log('[E2E TEST] ✅ Provider saved successfully');
  });

  it('STEP 2: Should validate Ollama connection', async () => {
    console.log('[E2E TEST] Validating Ollama connection...');
    
    const result = await provider.validate();
    console.log('[E2E TEST] Validation result:', result);
    
    if (!result.valid) {
      console.error('[E2E TEST] ❌ Ollama validation failed:', result.error);
      console.error('[E2E TEST] Make sure Ollama is running: ollama serve');
      throw new Error(`Ollama validation failed: ${result.error}`);
    }
    
    expect(result.valid).toBe(true);
    console.log('[E2E TEST] ✅ Ollama connection validated');
  });

  it('STEP 3: Should list available models', async () => {
    console.log('[E2E TEST] Listing models...');
    
    const models = await provider.listModels();
    console.log('[E2E TEST] Available models:', models);
    
    expect(Array.isArray(models)).toBe(true);
    
    if (models.length === 0) {
      console.warn('[E2E TEST] ⚠️ No models found. Run: ollama pull gemma3');
      return;
    }
    
    expect(models.length).toBeGreaterThan(0);
    console.log('[E2E TEST] ✅ Found', models.length, 'models');
  });

  it('STEP 4: Should substitute parameters in prompt', () => {
    const template = 'Hello {{name}}, you are {{age}} years old.';
    const params = { name: 'Alice', age: '25' };
    
    console.log('[E2E TEST] Substituting parameters...');
    const result = parameterService.substitute(template, params);
    console.log('[E2E TEST] Result:', result);
    
    expect(result).toBe('Hello Alice, you are 25 years old.');
    console.log('[E2E TEST] ✅ Parameter substitution works');
  });

  it('STEP 5: Should count tokens', () => {
    const text = 'This is a test prompt for token counting.';
    
    console.log('[E2E TEST] Counting tokens...');
    const count = tokenCounter.estimateTokens(text, 'ollama');
    console.log('[E2E TEST] Token count:', count);
    
    expect(count).toBeGreaterThan(0);
    console.log('[E2E TEST] ✅ Token counting works');
  });

  it('STEP 6: Should enqueue and dequeue request', () => {
    const request: LLMRequest = {
      id: 'test-req-1',
      promptId: 'test-prompt-1',
      promptContent: 'Test prompt content',
      parameters: {},
      provider: 'ollama',
      model: 'gemma3:1b',
      status: 'pending',
      createdAt: Date.now()
    };

    console.log('[E2E TEST] Testing request queue...');
    requestQueue.enqueue(request);
    expect(requestQueue.size()).toBe(1);
    
    const dequeued = requestQueue.dequeue();
    expect(dequeued?.id).toBe('test-req-1');
    expect(requestQueue.size()).toBe(0);
    
    console.log('[E2E TEST] ✅ Request queue works');
  });

  it('STEP 7: Should generate text with Ollama [ACTUAL LLM CALL]', async () => {
    console.log('[E2E TEST] ========================================');
    console.log('[E2E TEST] ACTUAL LLM GENERATION TEST');
    console.log('[E2E TEST] ========================================');
    
    // Get models first
    const models = await provider.listModels();
    if (models.length === 0) {
      console.warn('[E2E TEST] ⚠️ Skipping generation - no models found');
      return;
    }
    
    // Use the smallest model for speed
    const modelName = models.find(m => m.includes('1b')) || models[0];
    console.log('[E2E TEST] Using model:', modelName);
    
    const prompt = 'Say "TESTING 123" and nothing else.';
    console.log('[E2E TEST] Prompt:', prompt);
    console.log('[E2E TEST] Calling LLM...');
    
    const startTime = Date.now();
    const result = await provider.generate(prompt, {
      model: modelName,
      baseUrl: 'http://localhost:11434',
      credentials: '',
      timeoutSeconds: 120
    });
    const elapsed = Date.now() - startTime;
    
    console.log('[E2E TEST] ========================================');
    console.log('[E2E TEST] GENERATION RESULT:');
    console.log('[E2E TEST]   Content:', result.content);
    console.log('[E2E TEST]   Model:', result.model);
    console.log('[E2E TEST]   Tokens:', result.tokenUsage);
    console.log('[E2E TEST]   Time:', elapsed, 'ms');
    console.log('[E2E TEST] ========================================');
    
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.tokenUsage.total).toBeGreaterThan(0);
    
    console.log('[E2E TEST] ✅ ACTUAL LLM GENERATION SUCCESSFUL!');
  }, 120000); // 2 minute timeout

  it('STEP 8: Should save response metadata and content', async () => {
    const promptId = 'test-prompt-1';
    const responseId = 'test-response-' + Date.now();
    
    console.log('[E2E TEST] Saving response...');
    
    // Save metadata (filePath will be set after saving content)
    const metadata: LLMResponseMetadata = {
      id: responseId,
      promptId,
      provider: 'ollama',
      model: 'gemma3:1b',
      parameters: {},
      createdAt: Date.now(),
      completedAt: Date.now(),
      tokenUsage: { prompt: 10, completion: 5, total: 15 },
      costEstimate: 0,
      status: 'completed',
      filePath: '' // Will be set after saveResponseContent
    };
    
    // Save content first to get the actual file path
    const relativePath = await storageService.saveResponseContent(promptId, 'Test Prompt', responseId, 'Test response content', metadata, 'Test prompt content');
    
    // Update metadata with actual file path and save
    metadata.filePath = relativePath;
    await storageService.saveResponseMetadata(metadata);
    
    // Retrieve
    const retrievedMetadata = await storageService.getResponseMetadata(responseId);
    const content = await storageService.getResponseContent(relativePath);
    
    expect(retrievedMetadata).toBeDefined();
    expect(retrievedMetadata?.id).toBe(responseId);
    expect(content).toBe('Test response content');
    
    console.log('[E2E TEST] ✅ Response saved and retrieved');
  });

  it('STEP 9: Should list responses for prompt', async () => {
    // Use the same promptId from STEP 8
    const promptId = 'test-prompt-' + Date.now();
    
    // Create a response for this prompt
    const responseId = 'test-response-' + Date.now();
    const metadata: LLMResponseMetadata = {
      id: responseId,
      promptId,
      provider: 'ollama',
      model: 'gemma3:1b',
      parameters: {},
      createdAt: Date.now(),
      tokenUsage: { prompt: 10, completion: 5, total: 15 },
      costEstimate: 0,
      status: 'completed',
      filePath: ''
    };
    
    const relativePath = await storageService.saveResponseContent(promptId, 'Test Prompt', responseId, 'Test content', metadata, 'prompt');
    metadata.filePath = relativePath;
    await storageService.saveResponseMetadata(metadata);
    
    const responses = await storageService.listResponseMetadata(promptId);
    
    console.log('[E2E TEST] Found', responses.length, 'responses');
    expect(responses.length).toBeGreaterThan(0);
    
    console.log('[E2E TEST] ✅ Response listing works');
  });

  it('STEP 10: Should delete response', async () => {
    const responses = await storageService.listResponseMetadata('test-prompt-1');
    if (responses.length === 0) return;
    
    const responseId = responses[0].id;
    console.log('[E2E TEST] Deleting response:', responseId);
    
    await storageService.deleteResponse(responseId);
    
    const deleted = await storageService.getResponseMetadata(responseId);
    expect(deleted).toBeNull();
    
    console.log('[E2E TEST] ✅ Response deletion works');
  });
});

