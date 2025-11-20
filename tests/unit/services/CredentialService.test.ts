/**
 * Unit Tests for CredentialService (TDD)
 * 
 * Tests credential encryption/decryption using Electron's safeStorage API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock electron's safeStorage BEFORE importing the service
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plaintext: string) => Buffer.from(`encrypted:${plaintext}`, 'utf-8')),
    decryptString: vi.fn((encrypted: Buffer) => {
      const str = encrypted.toString('utf-8');
      if (!str.startsWith('encrypted:')) {
        throw new Error('Invalid encrypted format');
      }
      return str.replace('encrypted:', '');
    })
  }
}));

import { safeStorage } from 'electron';
import { CredentialService } from '@main/services/CredentialService';

describe('CredentialService', () => {
  let service: CredentialService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset spy behavior for each test
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
    
    service = new CredentialService();
  });

  describe('availability check', () => {
    it('should check if encryption is available', () => {
      const available = service.isAvailable();
      expect(available).toBe(true);
      expect(safeStorage.isEncryptionAvailable).toHaveBeenCalled();
    });

    it('should return false when encryption is not available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
      const available = service.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('encryption', () => {
    it('should encrypt API key', () => {
      const apiKey = 'sk-test-key-12345';
      const encrypted = service.encryptCredential(apiKey);
      
      expect(encrypted).toBeInstanceOf(Buffer);
      expect(safeStorage.encryptString).toHaveBeenCalledWith(apiKey);
    });

    it('should throw error if encryption not available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
      
      expect(() => {
        service.encryptCredential('test-key');
      }).toThrow('Encryption not available');
    });

    it('should handle empty string', () => {
      const encrypted = service.encryptCredential('');
      expect(encrypted).toBeInstanceOf(Buffer);
    });

    it('should handle special characters', () => {
      const specialKey = 'key-with-特殊字符-!@#$%^&*()';
      const encrypted = service.encryptCredential(specialKey);
      expect(encrypted).toBeInstanceOf(Buffer);
    });
  });

  describe('decryption', () => {
    it('should decrypt API key', () => {
      const originalKey = 'sk-test-key-12345';
      const encrypted = service.encryptCredential(originalKey);
      const decrypted = service.decryptCredential(encrypted);
      
      expect(decrypted).toBe(originalKey);
      expect(safeStorage.decryptString).toHaveBeenCalledWith(encrypted);
    });

    it('should throw error if encryption not available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
      const dummyBuffer = Buffer.from('encrypted-data');
      
      expect(() => {
        service.decryptCredential(dummyBuffer);
      }).toThrow('Decryption not available');
    });

    it('should handle empty buffer', () => {
      const emptyBuffer = Buffer.from('');
      vi.mocked(safeStorage.decryptString).mockReturnValue('');
      
      const decrypted = service.decryptCredential(emptyBuffer);
      expect(decrypted).toBe('');
    });

    it('should throw on invalid encrypted data', () => {
      vi.mocked(safeStorage.decryptString).mockImplementation(() => {
        throw new Error('Invalid encrypted data');
      });
      
      const invalidBuffer = Buffer.from('invalid-data');
      expect(() => {
        service.decryptCredential(invalidBuffer);
      }).toThrow('Invalid encrypted data');
    });
  });

  describe('credential validation', () => {
    it('should validate OpenAI API key format', () => {
      expect(service.validateCredential('sk-proj-1234567890', 'openai')).toBe(true);
      expect(service.validateCredential('sk-1234567890', 'openai')).toBe(true);
      expect(service.validateCredential('invalid-key', 'openai')).toBe(false);
      expect(service.validateCredential('', 'openai')).toBe(false);
    });

    it('should validate Azure OpenAI API key format', () => {
      // Azure keys are typically 32-character hex strings
      expect(service.validateCredential('a'.repeat(32), 'azure_openai')).toBe(true);
      expect(service.validateCredential('123456789abcdef', 'azure_openai')).toBe(false);
      expect(service.validateCredential('', 'azure_openai')).toBe(false);
    });

    it('should validate Gemini API key format', () => {
      // Gemini keys start with "AI" followed by characters
      expect(service.validateCredential('AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'gemini')).toBe(true);
      expect(service.validateCredential('invalid-key', 'gemini')).toBe(false);
      expect(service.validateCredential('', 'gemini')).toBe(false);
    });

    it('should allow any non-empty credential for Ollama (no API key required)', () => {
      // Ollama doesn't require API key, but we can store custom auth if needed
      expect(service.validateCredential('', 'ollama')).toBe(true);
      expect(service.validateCredential('optional-token', 'ollama')).toBe(true);
    });

    it('should be case-insensitive for provider type', () => {
      expect(service.validateCredential('sk-test', 'OPENAI' as any)).toBe(true);
      expect(service.validateCredential('sk-test', 'OpenAI' as any)).toBe(true);
    });
  });

  describe('round-trip encryption', () => {
    it('should successfully encrypt and decrypt', () => {
      // Test with simple keys that work with the mock
      const testKey = 'sk-openai-key';
      
      // Ensure mocks are set up correctly
      vi.mocked(safeStorage.encryptString).mockReturnValue(Buffer.from(`encrypted:${testKey}`, 'utf-8'));
      vi.mocked(safeStorage.decryptString).mockImplementation((encrypted: Buffer) => {
        const str = encrypted.toString('utf-8');
        if (!str.startsWith('encrypted:')) {
          throw new Error('Invalid encrypted format');
        }
        return str.replace('encrypted:', '');
      });
      
      const encrypted = service.encryptCredential(testKey);
      
      // Verify encryption creates proper format
      expect(encrypted.toString('utf-8')).toContain('encrypted:');
      
      const decrypted = service.decryptCredential(encrypted);
      expect(decrypted).toBe(testKey);
    });
  });

  describe('security', () => {
    it('should never log plaintext credentials', () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const consoleDebugSpy = vi.spyOn(console, 'debug');
      
      const sensitiveKey = 'sk-super-secret-key';
      service.encryptCredential(sensitiveKey);
      
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining(sensitiveKey));
      expect(consoleDebugSpy).not.toHaveBeenCalledWith(expect.stringContaining(sensitiveKey));
    });

    it('should not expose plaintext in error messages', () => {
      vi.mocked(safeStorage.encryptString).mockImplementation(() => {
        throw new Error('Encryption failed');
      });
      
      try {
        service.encryptCredential('sk-secret-key');
      } catch (err: any) {
        expect(err.message).not.toContain('sk-secret-key');
      }
    });
  });
});

