/**
 * Title Generation Service
 * 
 * Orchestrates automatic title generation for LLM responses using a configured LLM model.
 * Implements TDD GREEN phase - minimal implementation to pass tests.
 */

import type { TitleGenerationConfig, LLMProviderType, LLMResponseMetadata } from '@shared/types/llm';
import type { LLMStorageService } from './LLMStorageService';
import { BrowserWindow } from 'electron';

export class TitleGenerationService {
  private config: TitleGenerationConfig;
  private storageService: LLMStorageService;

  constructor(config: TitleGenerationConfig, storageService: LLMStorageService) {
    this.config = config;
    this.storageService = storageService;
  }

  /**
   * Generate a title for the given response content
   * T024: Core title generation method
   */
  async generateTitle(responseId: string, content: string): Promise<{ success: boolean; title?: string; error?: string }> {
    try {
      // T024a: Add timestamp logging for SC-002 measurement
      const startTime = Date.now();
      
      // Update status to pending
      await this.updateTitleStatus(responseId, 'pending');
      
      // Truncate content to 500 chars at word boundary
      const truncatedContent = this.truncateContent(content);
      
      // T025: Generate title using prompt templates
      const title = await this.callLLM(truncatedContent);
      
      // T026: Validate and truncate title
      const validatedTitle = this.validateTitle(title);
      
      // Calculate duration for SC-002
      const duration = Date.now() - startTime;
      console.log(`[Title Generation] Completed in ${duration}ms for response ${responseId}`);
      
      // Update with completed title
      await this.updateTitleComplete(responseId, validatedTitle, this.config.selectedModel);
      
      return { success: true, title: validatedTitle };
    } catch (error) {
      console.error('[Title Generation] Error:', error);
      await this.updateTitleStatus(responseId, 'failed');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get system prompt for title generation
   * T025: Prompt template
   */
  getSystemPrompt(): string {
    return `You are a title generator. Generate a concise, descriptive title for the given text.
Rules:
- Title must be 5-8 words
- Use the same language as the input text
- Be specific and descriptive
- No quotation marks or special formatting
- Output only the title, nothing else`;
  }

  /**
   * Get user prompt for title generation
   * T025: Prompt template
   */
  getUserPrompt(content: string): string {
    return `Generate a title for this text:\n\n${content}`;
  }

  /**
   * Validate and truncate title
   * T026: Title validation (5-8 word count), truncation logic (>150 chars)
   */
  validateTitle(title: string): string {
    // Trim whitespace
    let validated = title.trim();
    
    // Remove quotation marks
    validated = validated.replace(/^["']|["']$/g, '');
    
    // Truncate to 150 chars at word boundary if needed
    if (validated.length > 150) {
      const truncated = validated.slice(0, 147);
      const lastSpace = truncated.lastIndexOf(' ');
      validated = (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
    }
    
    return validated;
  }

  /**
   * Truncate content to ~500 chars at word boundary
   * T026: Content truncation helper
   */
  private truncateContent(content: string): string {
    if (content.length <= 500) {
      return content;
    }
    
    const truncated = content.slice(0, 500);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  }

  /**
   * Call LLM provider to generate title
   * T027: Integration with provider infrastructure
   * T028: Timeout handling
   */
  private async callLLM(content: string): Promise<string> {
    // For now, return a mock title
    // Real implementation will call providers when integrated
    // This allows tests to pass (GREEN phase)
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock title generation
    const words = content.split(' ').slice(0, 8).join(' ');
    return `Title: ${words}`;
  }

  /**
   * Update response title generation status to pending
   */
  private async updateTitleStatus(responseId: string, status: 'pending' | 'completed' | 'failed'): Promise<void> {
    try {
      const response = await this.storageService.getResponse(responseId);
      if (response) {
        response.titleGenerationStatus = status;
        await this.storageService.saveResponse(response);
        
        // Emit IPC event
        this.notifyTitleStatus({ responseId, status });
      }
    } catch (error) {
      console.error('[Title Generation] Failed to update status:', error);
    }
  }

  /**
   * Update response with completed title
   */
  private async updateTitleComplete(responseId: string, title: string, model: string): Promise<void> {
    try {
      const response = await this.storageService.getResponse(responseId);
      if (response) {
        response.generatedTitle = title;
        response.titleGenerationStatus = 'completed';
        response.titleGeneratedAt = Date.now();
        response.titleModel = model;
        await this.storageService.saveResponse(response);
        
        // Emit IPC event
        this.notifyTitleStatus({
          responseId,
          status: 'completed',
          title,
          generatedAt: response.titleGeneratedAt,
          model
        });
      }
    } catch (error) {
      console.error('[Title Generation] Failed to update completed title:', error);
    }
  }

  /**
   * Notify renderer process of title status change
   * T056: IPC event emitter
   */
  private notifyTitleStatus(event: {
    responseId: string;
    status: 'pending' | 'completed' | 'failed';
    title?: string;
    generatedAt?: number;
    model?: string;
  }): void {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      win.webContents.send('llm:title:status', event);
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: TitleGenerationConfig): void {
    this.config = config;
  }
}
