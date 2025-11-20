/**
 * Credential Service
 * 
 * Handles secure encryption/decryption of API keys and credentials
 * using Electron's safeStorage API
 */

import { safeStorage } from 'electron';
import { LLMProviderType } from '@shared/types/llm';

export class CredentialService {
  /**
   * Check if encryption is available on this platform
   */
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Encrypt a credential (API key)
   */
  encryptCredential(plaintext: string): Buffer {
    if (!this.isAvailable()) {
      throw new Error('Encryption not available on this platform');
    }

    try {
      return safeStorage.encryptString(plaintext);
    } catch (err: any) {
      // Never expose plaintext in error
      throw new Error('Failed to encrypt credential');
    }
  }

  /**
   * Decrypt a credential
   */
  decryptCredential(encrypted: Buffer): string {
    if (!this.isAvailable()) {
      throw new Error('Decryption not available on this platform');
    }

    try {
      return safeStorage.decryptString(encrypted);
    } catch (err: any) {
      throw new Error('Invalid encrypted data');
    }
  }

  /**
   * Validate credential format for a given provider
   */
  validateCredential(credential: string, providerType: string): boolean {
    const normalizedType = providerType.toLowerCase() as LLMProviderType;

    switch (normalizedType) {
      case 'openai':
        return this.validateOpenAIKey(credential);
      
      case 'azure_openai':
        return this.validateAzureKey(credential);
      
      case 'gemini':
        return this.validateGeminiKey(credential);
      
      case 'ollama':
        // Ollama doesn't require API key (local)
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Validate OpenAI API key format
   * OpenAI keys start with "sk-" or "sk-proj-"
   */
  private validateOpenAIKey(key: string): boolean {
    if (!key || key.length === 0) return false;
    return key.startsWith('sk-');
  }

  /**
   * Validate Azure OpenAI API key format
   * Azure keys are typically 32-character strings
   */
  private validateAzureKey(key: string): boolean {
    if (!key || key.length === 0) return false;
    return key.length >= 32;
  }

  /**
   * Validate Google Gemini API key format
   * Gemini keys start with "AIza"
   */
  private validateGeminiKey(key: string): boolean {
    if (!key || key.length === 0) return false;
    return key.startsWith('AIza');
  }
}

