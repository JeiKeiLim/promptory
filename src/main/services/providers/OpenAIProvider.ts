/**
 * OpenAI Provider
 * 
 * Implementation of ILLMProvider for OpenAI's API
 */

import { TokenUsage } from '@shared/types/llm';
import OpenAI from 'openai';

interface ProviderConfig {
  providerType: string;
  baseURL?: string;
  modelName?: string;
  credentials?: string;
  timeoutSeconds?: number;
}

interface GenerateResult {
  content: string;
  model: string;
  tokenUsage?: TokenUsage;
  responseTimeMs: number;
}

export interface ILLMProvider {
  validate(config: ProviderConfig): Promise<{ success: boolean; error?: string }>;
  generate(config: ProviderConfig, prompt: string): Promise<GenerateResult>;
  listModels(config: ProviderConfig): Promise<string[]>;
}

export class OpenAIProvider implements ILLMProvider {
  /**
   * Validate OpenAI API connection and credentials
   */
  async validate(config: ProviderConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const client = new OpenAI({
        apiKey: config.credentials,
        baseURL: config.baseURL || 'https://api.openai.com/v1',
      });

      // Test with a simple models list call
      await client.models.list();
      
      return { success: true };
    } catch (error: any) {
      console.error('OpenAI validation failed:', error);
      
      if (error.status === 401) {
        return { success: false, error: 'Invalid API key' };
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return { success: false, error: 'Could not connect to OpenAI API' };
      }
      
      return { success: false, error: error.message || 'Validation failed' };
    }
  }

  /**
   * Generate response from OpenAI API
   */
  async generate(config: ProviderConfig, prompt: string): Promise<GenerateResult> {
    const startTime = Date.now();

    try {
      const client = new OpenAI({
        apiKey: config.credentials,
        baseURL: config.baseURL || 'https://api.openai.com/v1',
      });

      const timeout = (config.timeoutSeconds || 120) * 1000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const completion = await client.chat.completions.create(
          {
            model: config.modelName || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          },
          { signal: controller.signal as any }
        );

        clearTimeout(timeoutId);

        const responseTime = Date.now() - startTime;
        const content = completion.choices[0]?.message?.content || '';

        const tokenUsage: TokenUsage = {
          prompt: completion.usage?.prompt_tokens || 0,
          completion: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        };

        return {
          content,
          model: completion.model,
          tokenUsage,
          responseTimeMs: responseTime,
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeout / 1000} seconds`);
        }
        throw error;
      }
    } catch (error: any) {
      console.error('OpenAI generation failed:', error);
      
      if (error.status === 401) {
        throw new Error('Invalid API key');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.status === 404) {
        throw new Error(`Model '${config.modelName}' not found`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Could not connect to OpenAI API');
      } else if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('Failed to generate response');
    }
  }

  /**
   * List available OpenAI models
   */
  async listModels(config: ProviderConfig): Promise<string[]> {
    try {
      const client = new OpenAI({
        apiKey: config.credentials,
        baseURL: config.baseURL || 'https://api.openai.com/v1',
      });

      const response = await client.models.list();
      
      // Filter to only chat models
      const chatModels = response.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort();

      return chatModels;
    } catch (error: any) {
      console.error('Failed to list OpenAI models:', error);
      
      if (error.status === 401) {
        throw new Error('Invalid API key');
      }
      
      throw new Error('Failed to list models');
    }
  }
}

