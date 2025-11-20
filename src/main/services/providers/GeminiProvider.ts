/**
 * Gemini Provider
 * 
 * Implementation of ILLMProvider for Google's Gemini API
 */

import { TokenUsage } from '@shared/types/llm';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

export class GeminiProvider implements ILLMProvider {
  /**
   * Validate Gemini API connection and credentials
   */
  async validate(config: ProviderConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const genAI = new GoogleGenerativeAI(config.credentials || '');
      const model = genAI.getGenerativeModel({ model: config.modelName || 'gemini-pro' });

      // Test with a simple generation call
      const result = await model.generateContent('test');
      await result.response;
      
      return { success: true };
    } catch (error: any) {
      console.error('Gemini validation failed:', error);
      
      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('Invalid API key')) {
        return { success: false, error: 'Invalid API key' };
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return { success: false, error: 'Could not connect to Gemini API' };
      }
      
      return { success: false, error: error.message || 'Validation failed' };
    }
  }

  /**
   * Generate response from Gemini API
   */
  async generate(config: ProviderConfig, prompt: string): Promise<GenerateResult> {
    const startTime = Date.now();

    try {
      const genAI = new GoogleGenerativeAI(config.credentials || '');
      const model = genAI.getGenerativeModel({ model: config.modelName || 'gemini-pro' });

      const timeout = (config.timeoutSeconds || 120) * 1000;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), timeout)
      );

      const generatePromise = model.generateContent(prompt);

      const result = await Promise.race([generatePromise, timeoutPromise]) as any;
      const response = await result.response;
      const responseTime = Date.now() - startTime;
      const content = response.text();

      // Gemini provides token counts
      const tokenUsage: TokenUsage = {
        prompt: response.usageMetadata?.promptTokenCount || 0,
        completion: response.usageMetadata?.candidatesTokenCount || 0,
        total: response.usageMetadata?.totalTokenCount || 0,
      };

      return {
        content,
        model: config.modelName || 'gemini-pro',
        tokenUsage,
        responseTimeMs: responseTime,
      };
    } catch (error: any) {
      console.error('Gemini generation failed:', error);
      
      if (error.message === 'Request timed out') {
        throw new Error(`Request timed out after ${(config.timeoutSeconds || 120)} seconds`);
      } else if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('Invalid API key')) {
        throw new Error('Invalid API key');
      } else if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('model')) {
        throw new Error(`Model '${config.modelName}' not found or not accessible`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Could not connect to Gemini API');
      } else if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('Failed to generate response');
    }
  }

  /**
   * List available Gemini models
   */
  async listModels(config: ProviderConfig): Promise<string[]> {
    try {
      const genAI = new GoogleGenerativeAI(config.credentials || '');
      
      // Gemini SDK doesn't have a direct listModels method
      // Return common available models
      return [
        'gemini-pro',
        'gemini-pro-vision',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
      ];
    } catch (error: any) {
      console.error('Failed to list Gemini models:', error);
      
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid API key');
      }
      
      throw new Error('Failed to list models');
    }
  }
}

