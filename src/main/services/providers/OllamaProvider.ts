/**
 * Ollama Provider
 * 
 * Implements LLM provider interface for local Ollama instances
 * API Documentation: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import { GenerateOptions, GenerateResult } from '@shared/types/llm';

export interface ILLMProvider {
  validate(): Promise<{ valid: boolean; error?: string; message?: string }>;
  generate(prompt: string, options: GenerateOptions): Promise<GenerateResult>;
  listModels(): Promise<string[]>;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  temperature?: number;
  num_predict?: number;  // Ollama's name for maxTokens
  top_p?: number;
  stream?: boolean;
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaModel {
  name: string;
  size: number;
  digest?: string;
  modified_at?: string;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

export class OllamaProvider implements ILLMProvider {
  constructor(private baseUrl: string) {}

  /**
   * Validate connection to Ollama server
   */
  async validate(): Promise<{ valid: boolean; error?: string; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);

      if (!response.ok) {
        return {
          valid: false,
          error: `Server returned ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();

      return {
        valid: true,
        message: `Connected to Ollama${data.version ? ` v${data.version}` : ''}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check for common connection errors
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        return {
          valid: false,
          error: 'Could not connect to Ollama. Make sure Ollama is running on ' + this.baseUrl
        };
      }

      if (errorMessage.toLowerCase().includes('timeout')) {
        return {
          valid: false,
          error: 'Connection timeout. Check if Ollama is accessible.'
        };
      }

      return {
        valid: false,
        error: `Validation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Generate text using Ollama
   */
  async generate(prompt: string, options: GenerateOptions): Promise<GenerateResult> {
    try {
      const requestBody: OllamaGenerateRequest = {
        model: options.model,
        prompt,
        stream: false  // We don't support streaming in MVP
      };

      // Map options to Ollama's parameter names
      if (options.temperature !== undefined) {
        requestBody.temperature = options.temperature;
      }
      if (options.maxTokens !== undefined) {
        requestBody.num_predict = options.maxTokens;
      }
      if (options.topP !== undefined) {
        requestBody.top_p = options.topP;
      }

      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      };

      // Add abort signal if provided
      if (options.signal) {
        fetchOptions.signal = options.signal;
      }

      const response = await fetch(`${this.baseUrl}/api/generate`, fetchOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        if (response.status === 404) {
          throw new Error(`Model not found: ${options.model}. Use 'ollama pull ${options.model}' to download it.`);
        }
        
        throw new Error(errorMessage);
      }

      const data: OllamaGenerateResponse = await response.json();

      return {
        content: data.response || '',
        model: data.model,
        tokenUsage: {
          prompt: data.prompt_eval_count || 0,
          completion: data.eval_count || 0,
          total: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        finishReason: data.done ? 'stop' : 'length'
      };
    } catch (error) {
      // Re-throw with more context if it's a generic error
      if (error instanceof Error) {
        if (error.message.includes('aborted')) {
          throw new Error('Request was cancelled');
        }
        if (error.message.includes('ECONNREFUSED')) {
          throw new Error('Could not connect to Ollama. Make sure it is running.');
        }
        if (error.message.toLowerCase().includes('timeout')) {
          throw new Error('Request timed out. The model might be too slow or the server is overloaded.');
        }
        throw error;
      }
      throw new Error('Unknown error during generation');
    }
  }

  /**
   * List available models from Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
      }

      const data: OllamaTagsResponse = await response.json();

      // Return empty array if models is undefined or not an array
      if (!data.models || !Array.isArray(data.models)) {
        return [];
      }

      return data.models.map(model => model.name);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          throw new Error('Could not connect to Ollama');
        }
        throw error;
      }
      throw new Error('Failed to list models');
    }
  }
}

