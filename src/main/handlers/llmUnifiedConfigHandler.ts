/**
 * Unified LLM Configuration IPC Handlers
 * 
 * Handles IPC communication for unified LLM configuration combining
 * LLM call settings and title generation settings.
 * 
 * Phase 3 GREEN: IPC Handler Implementation (T050-T057)
 */

import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { UnifiedLLMConfig, UnifiedLLMConfigValidation, TitleGenerationConfig } from '@shared/types/llm';
import { getStorageService, getTitleService } from './llmHandlers';

const CONFIG_DIR = path.join(app.getPath('userData'), '.config');
const UNIFIED_CONFIG_PATH = path.join(CONFIG_DIR, 'llm-unified.json');
const OLD_PROVIDER_PATH = path.join(CONFIG_DIR, 'llm-provider.json');
const OLD_TITLE_PATH = path.join(CONFIG_DIR, 'title-generation.json');

// Default configuration
export const DEFAULT_UNIFIED_CONFIG: UnifiedLLMConfig = {
  provider: 'ollama',
  llmCall: {
    model: 'gemma3',
    timeout: 60
  },
  titleGeneration: {
    enabled: true,
    model: 'gemma3:1b',
    timeout: 30
  }
};

/**
 * T051: Validate unified LLM configuration
 */
export function validateUnifiedConfig(config: UnifiedLLMConfig): UnifiedLLMConfigValidation {
  const errors: string[] = [];

  // Validate provider
  if (!config.provider) {
    errors.push('Provider is required');
  }

  // Validate LLM call settings
  if (!config.llmCall.model || config.llmCall.model.trim() === '') {
    errors.push('LLM call model is required');
  }

  if (config.llmCall.timeout < 1 || config.llmCall.timeout > 999) {
    errors.push('LLM call timeout must be between 1 and 999 seconds');
  }

  // Validate title generation settings
  if (!config.titleGeneration.model || config.titleGeneration.model.trim() === '') {
    errors.push('Title generation model is required');
  }

  if (config.titleGeneration.timeout < 1 || config.titleGeneration.timeout > 999) {
    errors.push('Title generation timeout must be between 1 and 999 seconds');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * T055: Migrate old configuration files to unified format
 * Falls back to DEFAULT_UNIFIED_CONFIG on error, logs warning, continues app startup
 */
async function migrateOldConfigs(): Promise<UnifiedLLMConfig> {
  try {
    // Try to read old config files
    const [providerExists, titleExists] = await Promise.all([
      fs.access(OLD_PROVIDER_PATH).then(() => true).catch(() => false),
      fs.access(OLD_TITLE_PATH).then(() => true).catch(() => false)
    ]);

    if (!providerExists && !titleExists) {
      // No old configs to migrate
      return DEFAULT_UNIFIED_CONFIG;
    }

    // Read old configurations
    let provider = DEFAULT_UNIFIED_CONFIG.provider;
    let llmModel = DEFAULT_UNIFIED_CONFIG.llmCall.model;
    let llmTimeout = DEFAULT_UNIFIED_CONFIG.llmCall.timeout;
    let titleEnabled = DEFAULT_UNIFIED_CONFIG.titleGeneration.enabled;
    let titleModel = DEFAULT_UNIFIED_CONFIG.titleGeneration.model;
    let titleTimeout = DEFAULT_UNIFIED_CONFIG.titleGeneration.timeout;

    if (providerExists) {
      try {
        const providerData = await fs.readFile(OLD_PROVIDER_PATH, 'utf-8');
        const providerConfig = JSON.parse(providerData);
        if (providerConfig.providerType) {
          provider = providerConfig.providerType;
        }
        if (providerConfig.modelName) {
          llmModel = providerConfig.modelName;
        }
        if (providerConfig.timeoutSeconds) {
          llmTimeout = Math.min(999, Math.max(1, providerConfig.timeoutSeconds));
        }
      } catch (error) {
        console.warn('Failed to parse old provider config, using defaults:', error);
      }
    }

    if (titleExists) {
      try {
        const titleData = await fs.readFile(OLD_TITLE_PATH, 'utf-8');
        const titleConfig = JSON.parse(titleData);
        if (titleConfig.enabled !== undefined) {
          titleEnabled = titleConfig.enabled;
        }
        if (titleConfig.selectedModel) {
          titleModel = titleConfig.selectedModel;
        }
        if (titleConfig.timeoutSeconds) {
          titleTimeout = Math.min(999, Math.max(1, titleConfig.timeoutSeconds));
        }
      } catch (error) {
        console.warn('Failed to parse old title config, using defaults:', error);
      }
    }

    return {
      provider,
      llmCall: {
        model: llmModel,
        timeout: llmTimeout
      },
      titleGeneration: {
        enabled: titleEnabled,
        model: titleModel,
        timeout: titleTimeout
      }
    };
  } catch (error) {
    console.warn('Migration error, falling back to defaults:', error);
    return DEFAULT_UNIFIED_CONFIG;
  }
}

/**
 * T052: Load unified configuration from file system
 */
async function loadUnifiedConfig(): Promise<UnifiedLLMConfig> {
  try {
    // Ensure config directory exists
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    // Check if unified config exists
    const configExists = await fs.access(UNIFIED_CONFIG_PATH)
      .then(() => true)
      .catch(() => false);

    if (!configExists) {
      // Try to migrate from old configs
      const migratedConfig = await migrateOldConfigs();
      
      // Save migrated config
      await fs.writeFile(UNIFIED_CONFIG_PATH, JSON.stringify(migratedConfig, null, 2), 'utf-8');
      
      return migratedConfig;
    }

    // Read existing unified config
    const configData = await fs.readFile(UNIFIED_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData) as UnifiedLLMConfig;

    return config;
  } catch (error) {
    console.error('Failed to load unified config:', error);
    return DEFAULT_UNIFIED_CONFIG;
  }
}

/**
 * T053: Save unified configuration to file system with atomic write
 */
async function saveUnifiedConfig(config: UnifiedLLMConfig): Promise<void> {
  try {
    // Ensure config directory exists
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    // Atomic write: write to temp file then rename
    const tempPath = `${UNIFIED_CONFIG_PATH}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(config, null, 2), 'utf-8');
    await fs.rename(tempPath, UNIFIED_CONFIG_PATH);
  } catch (error) {
    console.error('Failed to save unified config:', error);
    throw error;
  }
}

/**
 * T056: Register all IPC handlers
 */
export function registerUnifiedLLMConfigHandlers() {
  // T052: GET handler
  ipcMain.handle(IPC_CHANNELS.LLM_UNIFIED_CONFIG_GET, async () => {
    try {
      const config = await loadUnifiedConfig();
      return { success: true, config };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load configuration',
        config: DEFAULT_UNIFIED_CONFIG
      };
    }
  });

  // T053: SAVE handler
  ipcMain.handle(IPC_CHANNELS.LLM_UNIFIED_CONFIG_SAVE, async (_event, { config }: { config: UnifiedLLMConfig }) => {
    try {
      // Validate before saving
      const validation = validateUnifiedConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      await saveUnifiedConfig(config);
      
      // Also update the database with title generation config
      // This ensures TitleGenerationService gets the updated config
      const storageService = getStorageService();
      const titleService = getTitleService();
      
      if (storageService && titleService) {
        const titleConfig: TitleGenerationConfig = {
          enabled: config.titleGeneration.enabled,
          selectedModel: config.titleGeneration.model,
          timeoutSeconds: config.titleGeneration.timeout,
          selectedProvider: config.provider
        };
        
        await storageService.updateTitleGenerationConfig(titleConfig);
        titleService.updateConfig(titleConfig);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration'
      };
    }
  });

  // T054: VALIDATE handler
  ipcMain.handle(IPC_CHANNELS.LLM_UNIFIED_CONFIG_VALIDATE, async (_event, { config }: { config: UnifiedLLMConfig }) => {
    try {
      const validation = validateUnifiedConfig(config);
      return {
        success: true,
        validation
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  });

  console.log('Unified LLM config handlers registered');
}
