/**
 * Unit Tests for TokenCounter (TDD)
 * 
 * Tests token counting for different LLM providers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LLMProviderType } from '@shared/types/llm';
import { TokenCounter } from '@main/services/TokenCounter';

describe('TokenCounter', () => {
  let counter: TokenCounter;

  beforeEach(() => {
    counter = new TokenCounter();
  });

  describe('token estimation', () => {
    it('should estimate tokens for simple text', () => {
      const text = 'Hello world';
      const tokens = counter.estimateTokens(text, 'ollama');
      
      // Simple estimation: ~1 token per 4 characters
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    it('should handle empty string', () => {
      const tokens = counter.estimateTokens('', 'ollama');
      expect(tokens).toBe(0);
    });

    it('should estimate more tokens for longer text', () => {
      const short = 'Hello';
      const long = 'Hello world, this is a much longer text with many more words';
      
      const shortTokens = counter.estimateTokens(short, 'ollama');
      const longTokens = counter.estimateTokens(long, 'ollama');
      
      expect(longTokens).toBeGreaterThan(shortTokens);
    });

    it('should handle unicode characters', () => {
      const unicode = '世界你好 こんにちは';
      const tokens = counter.estimateTokens(unicode, 'ollama');
      
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle special characters', () => {
      const special = '!@#$%^&*()_+-={}[]|:;<>?,./';
      const tokens = counter.estimateTokens(special, 'ollama');
      
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle whitespace', () => {
      const text = 'word1    word2\n\nword3\tword4';
      const tokens = counter.estimateTokens(text, 'ollama');
      
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle very long text', () => {
      const longText = 'word '.repeat(10000);
      const tokens = counter.estimateTokens(longText, 'ollama');
      
      expect(tokens).toBeGreaterThan(1000);
    });
  });

  describe('token limit checking', () => {
    it('should check if text is within limit', () => {
      const text = 'Hello world';
      const result = counter.checkTokenLimit(text, 'ollama', 'gemma3');
      
      expect(result).toHaveProperty('withinLimit');
      expect(result).toHaveProperty('tokenCount');
      expect(result).toHaveProperty('limit');
      expect(result.withinLimit).toBe(true);
    });

    it('should return false for text exceeding limit', () => {
      // Create very long text
      const longText = 'word '.repeat(100000);
      const result = counter.checkTokenLimit(longText, 'ollama', 'gemma3');
      
      expect(result.withinLimit).toBe(false);
      expect(result.tokenCount).toBeGreaterThan(result.limit);
    });

    it('should handle empty text', () => {
      const result = counter.checkTokenLimit('', 'ollama', 'gemma3');
      
      expect(result.withinLimit).toBe(true);
      expect(result.tokenCount).toBe(0);
    });
  });

  describe('model limits', () => {
    it('should return limit for Ollama gemma3', () => {
      const limit = counter.getModelLimit('ollama', 'gemma3');
      
      // Gemma 3 has 8192 context window
      expect(limit).toBeGreaterThan(0);
      expect(limit).toBe(6553); // 80% of 8192
    });

    it('should return limit for OpenAI gpt-4', () => {
      const limit = counter.getModelLimit('openai', 'gpt-4');
      
      expect(limit).toBeGreaterThan(0);
    });

    it('should return limit for OpenAI gpt-3.5-turbo', () => {
      const limit = counter.getModelLimit('openai', 'gpt-3.5-turbo');
      
      expect(limit).toBeGreaterThan(0);
    });

    it('should return limit for Gemini', () => {
      const limit = counter.getModelLimit('gemini', 'gemini-pro');
      
      expect(limit).toBeGreaterThan(0);
    });

    it('should return default limit for unknown model', () => {
      const limit = counter.getModelLimit('ollama', 'unknown-model');
      
      // Should return a reasonable default
      expect(limit).toBeGreaterThan(0);
      expect(limit).toBeGreaterThan(1000);
    });

    it('should use 80% of stated context window as conservative threshold', () => {
      // As per FR-040 and Assumption #10
      const limit = counter.getModelLimit('ollama', 'gemma3');
      
      // gemma3 has 8192 context, so 80% = 6553.6 ≈ 6553
      expect(limit).toBe(6553);
    });
  });

  describe('provider-specific behavior', () => {
    it('should handle different providers', () => {
      const text = 'Same text for all providers';
      
      const ollamaTokens = counter.estimateTokens(text, 'ollama');
      const openaiTokens = counter.estimateTokens(text, 'openai');
      const geminiTokens = counter.estimateTokens(text, 'gemini');
      
      // All should estimate some tokens
      expect(ollamaTokens).toBeGreaterThan(0);
      expect(openaiTokens).toBeGreaterThan(0);
      expect(geminiTokens).toBeGreaterThan(0);
      
      // They might differ slightly but should be similar
      const minTokens = Math.min(ollamaTokens, openaiTokens, geminiTokens);
      const maxTokens = Math.max(ollamaTokens, openaiTokens, geminiTokens);
      
      // Difference shouldn't be more than 50%
      expect(maxTokens).toBeLessThanOrEqual(minTokens * 1.5);
    });
  });

  describe('edge cases', () => {
    it('should handle null-like values gracefully', () => {
      const tokens = counter.estimateTokens('', 'ollama');
      expect(tokens).toBe(0);
    });

    it('should handle code snippets', () => {
      const code = `
        function hello() {
          console.log("Hello world");
          return true;
        }
      `;
      const tokens = counter.estimateTokens(code, 'ollama');
      
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle markdown', () => {
      const markdown = `
# Title

## Subtitle

- Item 1
- Item 2

\`\`\`javascript
const x = 1;
\`\`\`
      `;
      const tokens = counter.estimateTokens(markdown, 'ollama');
      
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle repeated whitespace', () => {
      const text = 'word     word          word';
      const tokens = counter.estimateTokens(text, 'ollama');
      
      expect(tokens).toBeGreaterThan(0);
    });
  });
});

