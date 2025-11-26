/**
 * Validation Utilities for Unified LLM Configuration
 * 
 * Reusable validation logic extracted from LLMSettings component (T064)
 */

import { UnifiedLLMConfig } from '@shared/types/llm';

export interface ValidationErrors {
  llmModel?: string;
  llmTimeout?: string;
  titleModel?: string;
  titleTimeout?: string;
}

/**
 * Validate unified LLM configuration
 * @param config - Partial config with values to validate
 * @returns ValidationErrors object with error messages
 */
export function validateUnifiedLLMConfig(config: {
  llmModel: string;
  llmTimeout: number;
  titleModel: string;
  titleTimeout: number;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  // Validate LLM model (required)
  if (!config.llmModel || config.llmModel.trim() === '') {
    errors.llmModel = 'LLM model is required';
  }

  // Validate LLM timeout (1-999)
  if (config.llmTimeout < 1 || config.llmTimeout > 999) {
    errors.llmTimeout = 'Timeout must be between 1 and 999 seconds';
  }

  // Validate title model (required)
  if (!config.titleModel || config.titleModel.trim() === '') {
    errors.titleModel = 'Title model is required';
  }

  // Validate title timeout (1-999)
  if (config.titleTimeout < 1 || config.titleTimeout > 999) {
    errors.titleTimeout = 'Timeout must be between 1 and 999 seconds';
  }

  return errors;
}

/**
 * Check if config has any validation errors
 */
export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
