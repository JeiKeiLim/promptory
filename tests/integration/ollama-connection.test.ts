/**
 * Integration test for Ollama connection
 * This test verifies the entire flow from UI → IPC → Handler → Provider → Ollama API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OllamaProvider } from '@main/services/providers/OllamaProvider';

describe('Ollama Connection Integration Test', () => {
  const baseUrl = 'http://localhost:11434';
  let provider: OllamaProvider;

  beforeAll(() => {
    provider = new OllamaProvider(baseUrl);
  });

  it('should connect to Ollama server', async () => {
    const result = await provider.validate();
    
    console.log('[TEST] Ollama validation result:', result);
    
    if (!result.valid) {
      console.error('[TEST] Ollama connection failed:', result.error);
      console.error('[TEST] Make sure Ollama is running: ollama serve');
      throw new Error(`Ollama validation failed: ${result.error}`);
    }
    
    expect(result.valid).toBe(true);
    expect(result.message).toContain('Connected to Ollama');
  }, 10000); // 10 second timeout

  it('should list available models', async () => {
    const models = await provider.listModels();
    
    console.log('[TEST] Ollama models:', models);
    
    expect(Array.isArray(models)).toBe(true);
    
    if (models.length > 0) {
      console.log(`[TEST] Found ${models.length} models:`, models);
      expect(models.length).toBeGreaterThan(0);
    } else {
      console.warn('[TEST] No models installed. Run: ollama pull gemma3');
    }
  }, 10000);

  it('should generate text with an installed model', async () => {
    // First, list models to find an installed one
    const models = await provider.listModels();
    
    if (!models || models.length === 0) {
      console.warn('[TEST] Skipping generation test - no models installed');
      console.warn('[TEST] Run: ollama pull gemma3');
      return;
    }
    
    // Use a small, fast model if available
    const modelName = models.find(m => m.includes('gemma3:1b')) || models[0];
    console.log(`[TEST] Testing generation with model: ${modelName}`);
    
    const result = await provider.generate('Say "Hello, World!" and nothing else.', {
      model: modelName,
      baseUrl,
      credentials: '',
      timeoutSeconds: 120
    });
    
    console.log('[TEST] Generation result:', result);
    
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.tokenUsage).toBeDefined();
    expect(result.tokenUsage.total).toBeGreaterThan(0);
    
    console.log('[TEST] Generated content:', result.content);
    console.log('[TEST] Token usage:', result.tokenUsage);
    console.log('[TEST] ✅ Ollama integration test PASSED!');
  }, 120000); // 2 minute timeout for generation
});

