/**
 * Integration Tests for LLMStorageService
 * 
 * Tests the storage service with REAL SQLite database
 * These are integration tests, not unit tests with mocks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LLMResponseMetadata, LLMProviderConfig } from '@shared/types/llm';
import { LLMStorageService } from '@main/services/LLMStorageService';

describe('LLMStorageService', () => {
  let service: LLMStorageService;
  let testDir: string;
  let testDbPath: string;
  let testResultsPath: string;

  beforeEach(async () => {
    // Create temp directory for test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-storage-test-'));
    testDbPath = path.join(testDir, 'test.db');
    testResultsPath = path.join(testDir, 'llm_results');
    
    service = new LLMStorageService(testDbPath, testResultsPath);
    await service.initialize();
  });

  afterEach(async () => {
    await service.close();
    // Cleanup temp directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should initialize database connection', async () => {
      // Service is already initialized in beforeEach, so this should not throw
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should create results directory', async () => {
      // Check directory was created
      const stats = await fs.stat(testResultsPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('provider configuration', () => {
    const mockConfig: LLMProviderConfig = {
      id: 'test-provider-1',
      providerType: 'ollama',
      displayName: 'Test Ollama',
      baseUrl: 'http://localhost:11434',
      modelName: 'gemma3',
      encryptedCredentials: undefined,
      timeoutSeconds: 120,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastValidatedAt: undefined
    };

    it('should save provider configuration', async () => {
      await expect(service.saveProviderConfig(mockConfig)).resolves.not.toThrow();
    });

    it('should retrieve provider configuration by id', async () => {
      await service.saveProviderConfig(mockConfig);
      const retrieved = await service.getProviderConfig(mockConfig.id);
      expect(retrieved).toMatchObject({
        id: mockConfig.id,
        providerType: mockConfig.providerType,
        displayName: mockConfig.displayName,
        baseUrl: mockConfig.baseUrl,
        modelName: mockConfig.modelName,
        timeoutSeconds: mockConfig.timeoutSeconds,
        isActive: mockConfig.isActive
      });
    });

    it('should return null for non-existent provider', async () => {
      const retrieved = await service.getProviderConfig('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should list all provider configurations', async () => {
      await service.saveProviderConfig(mockConfig);
      const list = await service.listProviderConfigs();
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        id: mockConfig.id,
        providerType: mockConfig.providerType,
        displayName: mockConfig.displayName
      });
    });

    it('should get active provider configuration', async () => {
      await service.saveProviderConfig(mockConfig);
      const active = await service.getActiveProviderConfig();
      expect(active).toMatchObject({
        id: mockConfig.id,
        isActive: true
      });
    });

    it('should set provider as active and deactivate others', async () => {
      const config2 = { ...mockConfig, id: 'test-provider-2', isActive: false };
      await service.saveProviderConfig(mockConfig);
      await service.saveProviderConfig(config2);
      
      await service.setActiveProvider(config2.id);
      
      const active = await service.getActiveProviderConfig();
      expect(active?.id).toBe(config2.id);
      expect(active?.isActive).toBe(true);
    });

    it('should delete provider configuration', async () => {
      await service.saveProviderConfig(mockConfig);
      await service.deleteProviderConfig(mockConfig.id);
      
      const retrieved = await service.getProviderConfig(mockConfig.id);
      expect(retrieved).toBeNull();
    });

    it('should enforce only one active provider', async () => {
      const config1 = { ...mockConfig, id: 'provider-1', isActive: true };
      const config2 = { ...mockConfig, id: 'provider-2', isActive: true };
      
      await service.saveProviderConfig(config1);
      await service.saveProviderConfig(config2);
      
      const active = await service.getActiveProviderConfig();
      expect(active?.id).toBe('provider-2'); // Last one wins
      
      const list = await service.listProviderConfigs();
      const activeCount = list.filter(c => c.isActive).length;
      expect(activeCount).toBe(1);
    });
  });

  describe('response metadata storage', () => {
    const mockMetadata: LLMResponseMetadata = {
      id: 'response-1',
      promptId: 'prompt-1',
      provider: 'ollama',
      model: 'gemma3',
      parameters: { topic: 'test' },
      createdAt: Date.now(),
      responseTimeMs: 1500,
      tokenUsage: {
        prompt: 10,
        completion: 50,
        total: 60
      },
      costEstimate: 0.001,
      status: 'completed',
      filePath: 'prompt-1/response-1.md'
    };

    it('should save response metadata', async () => {
      await expect(service.saveResponseMetadata(mockMetadata)).resolves.not.toThrow();
    });

    it('should retrieve response metadata by id', async () => {
      await service.saveResponseMetadata(mockMetadata);
      const retrieved = await service.getResponseMetadata(mockMetadata.id);
      expect(retrieved).toEqual(mockMetadata);
    });

    it('should return null for non-existent response', async () => {
      const retrieved = await service.getResponseMetadata('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should list response metadata for a prompt', async () => {
      await service.saveResponseMetadata(mockMetadata);
      // Create the corresponding markdown file to prevent orphaned filtering
      const filePath = path.join(testResultsPath, mockMetadata.filePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, '# Test Response\n\nContent', 'utf-8');
      
      const list = await service.listResponseMetadata('prompt-1');
      expect(list).toHaveLength(1);
      expect(list[0]).toEqual(mockMetadata);
    });

    it('should order responses by creation time (newest first)', async () => {
      const response1 = { ...mockMetadata, id: 'r1', createdAt: 1000, filePath: 'prompt-1/r1.md' };
      const response2 = { ...mockMetadata, id: 'r2', createdAt: 2000, filePath: 'prompt-1/r2.md' };
      const response3 = { ...mockMetadata, id: 'r3', createdAt: 1500, filePath: 'prompt-1/r3.md' };
      
      await service.saveResponseMetadata(response1);
      await service.saveResponseMetadata(response2);
      await service.saveResponseMetadata(response3);
      
      // Create corresponding markdown files to prevent orphaned filtering
      const resultsDir = path.join(testResultsPath, 'prompt-1');
      await fs.mkdir(resultsDir, { recursive: true });
      await fs.writeFile(path.join(resultsDir, 'r1.md'), '# Response 1', 'utf-8');
      await fs.writeFile(path.join(resultsDir, 'r2.md'), '# Response 2', 'utf-8');
      await fs.writeFile(path.join(resultsDir, 'r3.md'), '# Response 3', 'utf-8');
      
      const list = await service.listResponseMetadata('prompt-1');
      expect(list.map(r => r.id)).toEqual(['r2', 'r3', 'r1']);
    });

    it('should update response status', async () => {
      await service.saveResponseMetadata({ ...mockMetadata, status: 'pending' });
      await service.updateResponseStatus(mockMetadata.id, 'completed');
      
      const retrieved = await service.getResponseMetadata(mockMetadata.id);
      expect(retrieved?.status).toBe('completed');
    });

    it('should mark all pending responses as cancelled', async () => {
      const pending1 = { ...mockMetadata, id: 'p1', status: 'pending' as const };
      const pending2 = { ...mockMetadata, id: 'p2', status: 'pending' as const };
      const completed = { ...mockMetadata, id: 'c1', status: 'completed' as const };
      
      await service.saveResponseMetadata(pending1);
      await service.saveResponseMetadata(pending2);
      await service.saveResponseMetadata(completed);
      
      await service.markPendingAsCancelled();
      
      const p1 = await service.getResponseMetadata('p1');
      const p2 = await service.getResponseMetadata('p2');
      const c1 = await service.getResponseMetadata('c1');
      
      expect(p1?.status).toBe('cancelled');
      expect(p2?.status).toBe('cancelled');
      expect(c1?.status).toBe('completed');
    });
  });

  describe('response content storage (markdown files)', () => {
    it('should save and retrieve response content', async () => {
      const content = '# Test Response\n\nContent here';
      const promptId = 'prompt-1';
      const promptName = 'Test Prompt';
      const responseId = 'response-1';
      const metadata: LLMResponseMetadata = {
        id: responseId,
        promptId,
        provider: 'ollama',
        model: 'gemma3',
        parameters: {},
        createdAt: Date.now(),
        status: 'completed',
        filePath: `${promptName}_${promptId.substring(promptId.length - 8)}/${responseId}.md`
      };
      const promptContent = 'Test prompt content';
      
      const relativePath = await service.saveResponseContent(promptId, promptName, responseId, content, metadata, promptContent);
      
      // Update metadata with the actual file path returned
      metadata.filePath = relativePath;
      
      const retrieved = await service.getResponseContent(relativePath);
      expect(retrieved).toBe(content);
      
      // Verify file exists using the actual path returned
      const filePath = path.join(testResultsPath, relativePath);
      const stats = await fs.stat(filePath);
      expect(stats.isFile()).toBe(true);
    });

    it('should validate file paths using PathValidator', async () => {
      // PathValidator integration test - T011.5
      // Test that PathValidator prevents directory traversal
      // Since sanitizePromptName will sanitize the name, we need to test with a responseId that contains invalid chars
      const metadata: LLMResponseMetadata = {
        id: 'response-1',
        promptId: 'prompt-1',
        provider: 'ollama',
        model: 'gemma3',
        parameters: {},
        createdAt: Date.now(),
        status: 'completed',
        filePath: 'invalid.md'
      };
      // Test with a responseId that contains path traversal characters
      // The PathValidator should catch this when it validates the final relative path
      // Note: sanitizePromptName only sanitizes the prompt name, not the responseId
      // But the responseId is used as filename, and PathValidator validates the full relative path
      // Let's use a responseId that would create an invalid path when combined
      const maliciousResponseId = '../../../etc/passwd';
      await expect(
        service.saveResponseContent('prompt-1', 'Test', maliciousResponseId, 'malicious', metadata, 'prompt')
      ).rejects.toThrow();
    });

    it('should handle missing markdown files gracefully', async () => {
      await expect(service.getResponseContent('non-existent/path.md')).rejects.toThrow();
    });
  });

  describe('response deletion', () => {
    const mockMetadata: LLMResponseMetadata = {
      id: 'response-1',
      promptId: 'prompt-1',
      provider: 'ollama',
      model: 'gemma3',
      parameters: {},
      createdAt: Date.now(),
      status: 'completed',
      filePath: 'prompt-1/response-1.md'
    };

    it('should delete response metadata and markdown file', async () => {
      await service.saveResponseMetadata(mockMetadata);
      const metadata: LLMResponseMetadata = { ...mockMetadata };
      await service.saveResponseContent('prompt-1', 'Test Prompt', 'response-1', 'test content', metadata, 'prompt content');
      
      await service.deleteResponse(mockMetadata.id);
      
      const retrieved = await service.getResponseMetadata(mockMetadata.id);
      expect(retrieved).toBeNull();
      
      // File should also be deleted
      const filePath = path.join(testResultsPath, mockMetadata.filePath);
      await expect(fs.stat(filePath)).rejects.toThrow();
    });

    it('should handle missing markdown file on deletion gracefully', async () => {
      await service.saveResponseMetadata(mockMetadata);
      // Don't create the file, just metadata
      
      await expect(service.deleteResponse(mockMetadata.id)).resolves.not.toThrow();
    });

    it('should delete all responses for a prompt', async () => {
      const response1 = { ...mockMetadata, id: 'r1', filePath: 'prompt-1/r1.md' };
      const response2 = { ...mockMetadata, id: 'r2', filePath: 'prompt-1/r2.md' };
      
      await service.saveResponseMetadata(response1);
      await service.saveResponseMetadata(response2);
      await service.saveResponseContent('prompt-1', 'Test Prompt', 'r1', 'content 1', response1, 'prompt');
      await service.saveResponseContent('prompt-1', 'Test Prompt', 'r2', 'content 2', response2, 'prompt');
      
      await service.deleteAllResponses('prompt-1');
      
      const list = await service.listResponseMetadata('prompt-1');
      expect(list).toHaveLength(0);
    });
  });

  describe('hybrid storage integrity', () => {
    it('should maintain consistency between DB and file system', async () => {
      const metadata: LLMResponseMetadata = {
        id: 'response-1',
        promptId: 'prompt-1',
        provider: 'ollama',
        model: 'gemma3',
        parameters: {},
        createdAt: Date.now(),
        status: 'completed',
        filePath: 'prompt-1/response-1.md'
      };
      
      await service.saveResponseMetadata(metadata);
      const relativePath = await service.saveResponseContent('prompt-1', 'Test Prompt', 'response-1', 'Content', metadata, 'prompt content');
      
      // Update metadata with actual file path
      metadata.filePath = relativePath;
      
      // Both should exist
      const dbRecord = await service.getResponseMetadata('response-1');
      expect(dbRecord).toBeTruthy();
      
      // Content should be retrievable
      const content = await service.getResponseContent(relativePath);
      expect(content).toBe('Content');
    });

    it('should handle orphaned DB records (markdown file missing)', async () => {
      const metadata: LLMResponseMetadata = {
        id: 'response-1',
        promptId: 'prompt-1',
        provider: 'ollama',
        model: 'gemma3',
        parameters: {},
        createdAt: Date.now(),
        status: 'completed',
        filePath: 'prompt-1/response-1.md'
      };
      
      await service.saveResponseMetadata(metadata);
      // Don't create the file - simulates manual deletion
      
      // Metadata still exists
      const dbRecord = await service.getResponseMetadata('response-1');
      expect(dbRecord).toBeTruthy();
      
      // But content retrieval fails gracefully
      await expect(service.getResponseContent('prompt-1', 'response-1')).rejects.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should close database connection', async () => {
      await service.initialize();
      await expect(service.close()).resolves.not.toThrow();
    });

    it('should not fail if called multiple times', async () => {
      await service.initialize();
      await service.close();
      await expect(service.close()).resolves.not.toThrow();
    });
  });
});

