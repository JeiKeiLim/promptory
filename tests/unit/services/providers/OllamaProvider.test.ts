/**
 * Unit Tests for OllamaProvider (TDD)
 * 
 * Tests Ollama API integration for local LLM calls
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OllamaProvider } from '@main/services/providers/OllamaProvider';

// Mock fetch globally
global.fetch = vi.fn();

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  const baseUrl = 'http://localhost:11434';

  beforeEach(() => {
    provider = new OllamaProvider(baseUrl);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validate()', () => {
    it('should validate successful connection', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ version: '0.1.0' })
      } as Response);

      const result = await provider.validate();

      expect(result.valid).toBe(true);
      expect(result.message).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/version`);
    });

    it('should handle connection refused', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await provider.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Could not connect');
    });

    it('should handle invalid base URL', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Invalid URL'));

      const result = await provider.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle non-200 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      const result = await provider.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should handle timeout', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await provider.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('generate()', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        model: 'gemma3',
        response: 'This is a test response',
        done: true,
        context: [1, 2, 3],
        total_duration: 1500000000,
        load_duration: 100000000,
        prompt_eval_count: 10,
        eval_count: 50
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response);

      const result = await provider.generate('Test prompt', {
        model: 'gemma3',
        temperature: 0.7
      });

      expect(result.content).toBe('This is a test response');
      expect(result.model).toBe('gemma3');
      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage?.prompt).toBe(10);
      expect(result.tokenUsage?.completion).toBe(50);
      expect(result.tokenUsage?.total).toBe(60);
      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/generate`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('gemma3')
        })
      );
    });

    it('should handle generation with abort signal', async () => {
      const abortController = new AbortController();
      
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise((_, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Request aborted'));
          });
          abortController.abort();
        })
      );

      await expect(
        provider.generate('Test', { 
          model: 'gemma3', 
          signal: abortController.signal 
        })
      ).rejects.toThrow();
    });

    it('should handle model not found error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'model not found' })
      } as Response);

      await expect(
        provider.generate('Test', { model: 'nonexistent' })
      ).rejects.toThrow('Model not found');
    });

    it('should handle connection error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        provider.generate('Test', { model: 'gemma3' })
      ).rejects.toThrow();
    });

    it('should pass generation options correctly', async () => {
      const mockResponse = {
        model: 'gemma3',
        response: 'Test',
        done: true
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      await provider.generate('Test prompt', {
        model: 'gemma3',
        temperature: 0.5,
        maxTokens: 100,
        topP: 0.9
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);

      expect(body.model).toBe('gemma3');
      expect(body.prompt).toBe('Test prompt');
      expect(body.temperature).toBe(0.5);
      expect(body.num_predict).toBe(100); // Ollama uses num_predict
      expect(body.top_p).toBe(0.9);
    });

    it('should handle empty response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: '', done: true })
      } as Response);

      const result = await provider.generate('Test', { model: 'gemma3' });

      expect(result.content).toBe('');
    });

    it('should handle timeout', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(
        provider.generate('Test', { model: 'gemma3' })
      ).rejects.toThrow('timed out');
    });
  });

  describe('listModels()', () => {
    it('should list available models', async () => {
      const mockResponse = {
        models: [
          { name: 'gemma3:latest', size: 1024 },
          { name: 'llama2:latest', size: 2048 },
          { name: 'mistral:latest', size: 1536 }
        ]
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const models = await provider.listModels();

      expect(models).toHaveLength(3);
      expect(models).toContain('gemma3:latest');
      expect(models).toContain('llama2:latest');
      expect(models).toContain('mistral:latest');
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/tags`);
    });

    it('should return empty array when no models available', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] })
      } as Response);

      const models = await provider.listModels();

      expect(models).toEqual([]);
    });

    it('should handle connection error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(provider.listModels()).rejects.toThrow();
    });

    it('should handle invalid response format', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'format' })
      } as Response);

      const models = await provider.listModels();

      expect(models).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should provide user-friendly error messages', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(
        new Error('fetch failed')
      );

      await expect(
        provider.generate('Test', { model: 'gemma3' })
      ).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(
        new TypeError('NetworkError')
      );

      await expect(
        provider.generate('Test', { model: 'gemma3' })
      ).rejects.toThrow();
    });

    it('should handle JSON parse errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      } as Response);

      await expect(
        provider.generate('Test', { model: 'gemma3' })
      ).rejects.toThrow();
    });
  });
});

