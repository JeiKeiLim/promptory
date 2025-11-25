/**
 * Title Generation Integration Tests
 * 
 * RED phase: End-to-end tests for title generation flow
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TitleGenerationService } from '@main/services/TitleGenerationService';
import { LLMStorageService } from '@main/services/LLMStorageService';
import type { LLMResponseMetadata, TitleGenerationConfig } from '@shared/types/llm';

describe('Title Generation Integration Tests', () => {
  let tempDir: string;
  let dbPath: string;
  let resultsPath: string;
  let storageService: LLMStorageService;
  let titleService: TitleGenerationService;
  let testConfig: TitleGenerationConfig;

  beforeAll(async () => {
    // Create temporary directory for test database and files
    tempDir = path.join(os.tmpdir(), `title-gen-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    dbPath = path.join(tempDir, 'test.db');
    resultsPath = path.join(tempDir, 'results');
    
    // Initialize services
    storageService = new LLMStorageService(dbPath, resultsPath);
    await storageService.initialize();
    
    testConfig = {
      enabled: true,
      selectedModel: 'gemma3:1b',
      selectedProvider: 'ollama',
      timeoutSeconds: 30
    };
    
    // Create TitleGenerationService
    titleService = new TitleGenerationService(testConfig, storageService);
  });

  afterAll(async () => {
    // Cleanup
    await storageService?.close();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clean up responses between tests
    const responses = await storageService.getResponseHistory('test-prompt');
    for (const response of responses) {
      await storageService.deleteResponse(response.id);
    }
  });

  // T020: Integration test for complete title generation flow
  describe('complete title generation flow', () => {
    it('should generate title end-to-end with real LLM provider', async () => {
      // This test requires Ollama to be running
      // Skip if not available
      
      const promptId = 'test-prompt-flow';
      const promptName = 'Test Prompt';
      const content = 'Explain the benefits of using React hooks in modern web development. React hooks allow functional components to have state and lifecycle methods without using classes.';
      
      // 1. Save a mock response
      const responseMetadata: LLMResponseMetadata = {
        id: `response-${Date.now()}`,
        promptId,
        provider: 'ollama',
        model: 'gemma3:1b',
        parameters: {},
        createdAt: Date.now(),
        status: 'completed',
        filePath: `${promptName}/${Date.now()}.md`
      };
      
      await storageService.saveResponse(responseMetadata);
      await storageService.saveResponseContent(
        promptId,
        promptName,
        responseMetadata.id,
        content,
        responseMetadata,
        'Test prompt content'
      );
      
      // 2. Generate title
      expect(titleService).toBeDefined();
      const result = await titleService.generateTitle(responseMetadata.id, content);
      
      // 3. Verify title generation succeeded
      expect(result.success).toBe(true);
      expect(result.title).toBeDefined();
      expect(typeof result.title).toBe('string');
      expect(result.title.length).toBeGreaterThan(0);
      
      // 4. Verify title is stored in database
      const updatedMetadata = await storageService.getResponse(responseMetadata.id);
      expect(updatedMetadata).toBeDefined();
      expect(updatedMetadata?.generatedTitle).toBe(result.title);
      expect(updatedMetadata?.titleGenerationStatus).toBe('completed');
      expect(updatedMetadata?.titleGeneratedAt).toBeGreaterThan(0);
      expect(updatedMetadata?.titleModel).toBe('gemma3:1b');
    });

    it('should update title generation status to pending during generation', async () => {
      const responseId = `response-pending-${Date.now()}`;
      const promptName = 'Test';
      const content = 'Test content for pending status';
      
      const metadata: LLMResponseMetadata = {
        id: responseId,
        promptId: 'test',
        provider: 'ollama',
        model: 'gemma3:1b',
        parameters: {},
        createdAt: Date.now(),
        status: 'completed',
        filePath: `${promptName}/${Date.now()}.md`
      };
      
      await storageService.saveResponse(metadata);
      
      // Start title generation (don't await yet)
      const promise = titleService.generateTitle(responseId, content);
      
      // Check status is pending (this may be timing-dependent)
      await new Promise(resolve => setTimeout(resolve, 100));
      const pendingMetadata = await storageService.getResponse(responseId);
      
      // Status might be pending or already completed depending on speed
      expect(['pending', 'completed']).toContain(pendingMetadata?.titleGenerationStatus);
      
      await promise;
    });
  });

  // T021: Integration test for title persistence in SQLite
  describe('SQLite title persistence', () => {
    it('should save title fields to database', async () => {
      const responseId = `response-sqlite-${Date.now()}`;
      const testTitle = 'React Hooks Modern Development Guide';
      
      const metadata: LLMResponseMetadata = {
        id: responseId,
        promptId: 'test',
        provider: 'ollama',
        model: 'gemma3:1b',
        parameters: {},
        createdAt: Date.now(),
        status: 'completed',
        filePath: 'test.md',
        generatedTitle: testTitle,
        titleGenerationStatus: 'completed',
        titleGeneratedAt: Date.now(),
        titleModel: 'gemma3:1b'
      };
      
      await storageService.saveResponse(metadata);
      
      const retrieved = await storageService.getResponse(responseId);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.generatedTitle).toBe(testTitle);
      expect(retrieved?.titleGenerationStatus).toBe('completed');
      expect(retrieved?.titleGeneratedAt).toBeDefined();
      expect(retrieved?.titleModel).toBe('gemma3:1b');
    });

    it('should handle responses without title fields (backward compatibility)', async () => {
      const responseId = `response-legacy-${Date.now()}`;
      
      const metadata: LLMResponseMetadata = {
        id: responseId,
        promptId: 'test',
        provider: 'ollama',
        model: 'gemma3:1b',
        parameters: {},
        createdAt: Date.now(),
        status: 'completed',
        filePath: 'test.md'
        // No title fields
      };
      
      await storageService.saveResponse(metadata);
      
      const retrieved = await storageService.getResponse(responseId);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.generatedTitle).toBeUndefined();
      expect(retrieved?.titleGenerationStatus).toBeUndefined();
    });
  });

  // T022: Integration test for title persistence in markdown frontmatter
  describe('markdown frontmatter title persistence', () => {
    it('should save title fields to markdown frontmatter', async () => {
      const responseId = `response-markdown-${Date.now()}`;
      const promptId = 'test';
      const promptName = 'Test Prompt';
      const content = 'Test content';
      const testTitle = 'Test Title Generation Success';
      
      const metadata: LLMResponseMetadata = {
        id: responseId,
        promptId,
        provider: 'ollama',
        model: 'gemma3:1b',
        parameters: {},
        createdAt: Date.now(),
        status: 'completed',
        filePath: '', // Will be set by saveResponseContent
        generatedTitle: testTitle,
        titleGenerationStatus: 'completed',
        titleGeneratedAt: Date.now(),
        titleModel: 'gemma3:1b'
      };
      
      // Save response content which creates the file and returns the path
      const relativePath = await storageService.saveResponseContent(
        promptId,
        promptName,
        responseId,
        content,
        metadata,
        'Test prompt'
      );
      
      // Update metadata with the correct filePath
      metadata.filePath = relativePath;
      await storageService.saveResponse(metadata);
      
      // Load response and check metadata
      const filePath = path.join(resultsPath, relativePath);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      // Parse YAML frontmatter
      expect(fileContent).toContain('generated_title:');
      expect(fileContent).toContain(testTitle);
      expect(fileContent).toContain('title_generation_status: completed');
    });

    it('should read markdown files without title fields (backward compatibility)', async () => {
      const responseId = `response-legacy-md-${Date.now()}`;
      const promptId = 'test';
      const promptName = 'Test Prompt';
      const content = 'Test content';
      
      const metadata: LLMResponseMetadata = {
        id: responseId,
        promptId,
        provider: 'ollama',
        model: 'gemma3:1b',
        parameters: {},
        createdAt: Date.now(),
        status: 'completed',
        filePath: '' // Will be set by saveResponseContent
        // No title fields
      };
      
      const relativePath = await storageService.saveResponseContent(
        promptId,
        promptName,
        responseId,
        content,
        metadata,
        'Test prompt'
      );
      
      metadata.filePath = relativePath;
      await storageService.saveResponse(metadata);
      
      // Load response
      const filePath = path.join(resultsPath, relativePath);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      expect(fileContent).toBeDefined();
      expect(fileContent).toContain(content);
      // Title fields should not be in frontmatter
      expect(fileContent).not.toContain('generated_title:');
    });
  });
});
