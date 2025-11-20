/**
 * Token Counter Service
 * 
 * Estimates token counts for different LLM providers
 * Uses simple heuristic: ~1 token per 4 characters (approximation)
 */

import { LLMProviderType } from '@shared/types/llm';

interface ModelLimit {
  contextWindow: number;
  conservativeLimit: number; // 80% of context window
}

export class TokenCounter {
  // Model context windows (in tokens)
  private modelLimits: Record<string, ModelLimit> = {
    // Ollama models
    'ollama:gemma3': { contextWindow: 8192, conservativeLimit: 6553 },
    'ollama:llama2': { contextWindow: 4096, conservativeLimit: 3276 },
    'ollama:mistral': { contextWindow: 8192, conservativeLimit: 6553 },
    
    // OpenAI models
    'openai:gpt-4': { contextWindow: 8192, conservativeLimit: 6553 },
    'openai:gpt-4-turbo': { contextWindow: 128000, conservativeLimit: 102400 },
    'openai:gpt-3.5-turbo': { contextWindow: 16385, conservativeLimit: 13108 },
    
    // Azure OpenAI (same as OpenAI)
    'azure_openai:gpt-4': { contextWindow: 8192, conservativeLimit: 6553 },
    'azure_openai:gpt-4-turbo': { contextWindow: 128000, conservativeLimit: 102400 },
    'azure_openai:gpt-3.5-turbo': { contextWindow: 16385, conservativeLimit: 13108 },
    
    // Google Gemini models
    'gemini:gemini-pro': { contextWindow: 32768, conservativeLimit: 26214 },
    'gemini:gemini-1.5-pro': { contextWindow: 1048576, conservativeLimit: 838860 },
    
    // Default fallback
    'default': { contextWindow: 4096, conservativeLimit: 3276 }
  };

  /**
   * Estimate token count for text
   * Uses simple heuristic: ~1 token per 4 characters
   * This is an approximation - real tokenizers vary by model
   */
  estimateTokens(text: string, provider: LLMProviderType): number {
    if (!text || text.length === 0) return 0;

    // Simple estimation: 1 token ≈ 4 characters (rough average)
    // This works reasonably well for English text
    const estimatedTokens = Math.ceil(text.length / 4);

    // Account for whitespace (tokens are often split on whitespace)
    const words = text.trim().split(/\s+/).length;
    
    // Use the average of character-based and word-based estimates
    // Word-based is more accurate for natural language
    return Math.ceil((estimatedTokens + words) / 2);
  }

  /**
   * Check if text is within token limit for a given model
   */
  checkTokenLimit(
    text: string,
    provider: LLMProviderType,
    model: string
  ): { withinLimit: boolean; tokenCount: number; limit: number } {
    const tokenCount = this.estimateTokens(text, provider);
    const limit = this.getModelLimit(provider, model);

    return {
      withinLimit: tokenCount <= limit,
      tokenCount,
      limit
    };
  }

  /**
   * Get conservative token limit for a model
   * Returns 80% of stated context window per FR-040
   */
  getModelLimit(provider: LLMProviderType, model: string): number {
    const key = `${provider}:${model}`;
    const modelConfig = this.modelLimits[key] || this.modelLimits['default'];
    
    return modelConfig.conservativeLimit;
  }

  /**
   * Get full context window size (not conservative limit)
   */
  getContextWindow(provider: LLMProviderType, model: string): number {
    const key = `${provider}:${model}`;
    const modelConfig = this.modelLimits[key] || this.modelLimits['default'];
    
    return modelConfig.contextWindow;
  }

  /**
   * Register or update a model's limits
   * Useful for adding new models or custom configurations
   */
  registerModel(
    provider: LLMProviderType,
    model: string,
    contextWindow: number
  ): void {
    const key = `${provider}:${model}`;
    this.modelLimits[key] = {
      contextWindow,
      conservativeLimit: Math.floor(contextWindow * 0.8)
    };
  }
}

