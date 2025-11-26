/**
 * LLM IPC Handlers
 * 
 * Handles all IPC communication for LLM operations between renderer and main process
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { LLMStorageService } from '../services/LLMStorageService';
import { CredentialService } from '../services/CredentialService';
import { ParameterSubstitutionService } from '../services/ParameterSubstitutionService';
import { RequestQueue } from '../services/RequestQueue';
import { TokenCounter } from '../services/TokenCounter';
import { TitleGenerationService } from '../services/TitleGenerationService';
import { OllamaProvider } from '../services/providers/OllamaProvider';
import { OpenAIProvider } from '../services/providers/OpenAIProvider';
import { GeminiProvider } from '../services/providers/GeminiProvider';
import {
  SaveProviderRequest,
  SaveProviderResponse,
  SetActiveProviderRequest,
  SetActiveProviderResponse,
  ValidateProviderRequest,
  ValidateProviderResponse,
  ListProvidersResponse,
  DeleteProviderRequest,
  DeleteProviderResponse,
  CallLLMRequest,
  CallLLMResponse,
  CancelLLMRequest,
  CancelLLMResponse,
  CancelAllLLMResponse,
  GetHistoryRequest,
  GetHistoryResponse,
  GetResponseRequest,
  GetResponseResponse,
  DeleteResponseRequest,
  DeleteResponseResponse,
  DeleteAllResponsesRequest,
  DeleteAllResponsesResponse,
  ListModelsResponse,
  QueueStatusResponse,
  LLMResponseCompleteEvent,
  LLMQueueUpdatedEvent,
  LLMRequestProgressEvent
} from '@shared/types/llm-ipc';
import { LLMProviderConfig, LLMRequest, LLMResponseMetadata } from '@shared/types/llm';
import { v4 as uuidv4 } from 'uuid';

// Services
let storageService: LLMStorageService;
let credentialService: CredentialService;
let parameterService: ParameterSubstitutionService;
let requestQueue: RequestQueue;
let tokenCounter: TokenCounter;
let titleService: TitleGenerationService;

// State
let activeProvider: LLMProviderConfig | null = null;
let currentRequest: LLMRequest | null = null;
let processingAbortController: AbortController | null = null;

/**
 * Initialize LLM handlers and services
 */
export async function initializeLLMHandlers(
  dbPath: string,
  resultsPath: string,
  mainWindow: BrowserWindow
): Promise<void> {
  // Initialize services
  storageService = new LLMStorageService(dbPath, resultsPath);
  await storageService.initialize();

  credentialService = new CredentialService();
  parameterService = new ParameterSubstitutionService();
  requestQueue = new RequestQueue();
  tokenCounter = new TokenCounter();
  
  // T034: Initialize TitleGenerationService with saved config from database
  // Load saved config or use defaults if none exists
  const titleConfig = await storageService.getTitleGenerationConfig();
  titleService = new TitleGenerationService(titleConfig, storageService);

  // Clear any orphaned queue state from unexpected shutdown
  await storageService.markPendingAsCancelled();

  // Load active provider
  const providers = await storageService.listProviderConfigs();
  activeProvider = providers.find((p: LLMProviderConfig) => p.isActive) || null;

  // Register handlers
  registerProviderHandlers();
  registerCallHandlers(mainWindow);
  registerResponseHandlers();
  registerModelHandlers();
  registerQueueHandlers();
  registerTitleConfigHandlers(); // T067-T068
}

/**
 * Provider management handlers
 */
function registerProviderHandlers(): void {
  // Save provider configuration
  ipcMain.handle(IPC_CHANNELS.LLM_PROVIDER_SAVE, async (_, request: SaveProviderRequest): Promise<SaveProviderResponse> => {
    try {
      let config = { ...request.config };

      // Encrypt credentials if provided
      if (request.credentials) {
        if (!credentialService.isAvailable()) {
          return {
            success: false,
            error: 'Credential encryption not available on this platform'
          };
        }

        const encrypted = credentialService.encryptCredential(request.credentials);
        config.encryptedCredentials = encrypted;
      }

      // Set timestamps
      const now = Date.now();
      if (!config.id) {
        config.id = uuidv4();
        config.createdAt = now;
      } else if (!config.createdAt) {
        // If updating existing config without createdAt, fetch it or use now
        const existing = await storageService.getProviderConfig(config.id);
        config.createdAt = existing?.createdAt || now;
      }
      config.updatedAt = now;

      // Save to database
      await storageService.saveProviderConfig(config as LLMProviderConfig);

      // If this is the active provider, update our cache
      if (config.isActive) {
        activeProvider = config as LLMProviderConfig;
      }

      return {
        success: true,
        config: config as LLMProviderConfig
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save provider'
      };
    }
  });

  // Set active provider
  ipcMain.handle(IPC_CHANNELS.LLM_PROVIDER_SET_ACTIVE, async (_, request: SetActiveProviderRequest): Promise<SetActiveProviderResponse> => {
    try {
      await storageService.setActiveProvider(request.providerId);
      const providers = await storageService.listProviderConfigs();
      activeProvider = providers.find((p: LLMProviderConfig) => p.id === request.providerId) || null;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set active provider'
      };
    }
  });

  // Validate provider
  ipcMain.handle(IPC_CHANNELS.LLM_PROVIDER_VALIDATE, async (_, request: ValidateProviderRequest): Promise<ValidateProviderResponse> => {
    try {
      console.log('[LLM] Validating provider:', request.providerId);
      const config = await storageService.getProviderConfig(request.providerId);
      if (!config) {
        console.error('[LLM] Provider not found:', request.providerId);
        return {
          valid: false,
          error: 'Provider not found'
        };
      }

      console.log('[LLM] Provider config:', { 
        type: config.providerType, 
        baseUrl: config.baseUrl,
        modelName: config.modelName 
      });

      // Create provider instance based on type
      let provider;
      
      // Decrypt credentials if needed
      let decryptedKey = '';
      if (config.encryptedCredentials && credentialService.isAvailable()) {
        decryptedKey = credentialService.decryptCredential(config.encryptedCredentials);
      }
      
      const providerConfig: any = {
        providerType: config.providerType,
        baseURL: config.baseUrl,
        modelName: config.modelName,
        credentials: decryptedKey,
        timeoutSeconds: config.timeoutSeconds,
      };

      if (config.providerType === 'ollama') {
        const baseUrl = config.baseUrl || 'http://localhost:11434';
        console.log('[LLM] Creating Ollama provider with baseUrl:', baseUrl);
        provider = new OllamaProvider(baseUrl);
        const result = await provider.validate();
        console.log('[LLM] Ollama validation result:', result);

        // Update last validated timestamp if successful
        if (result.valid) {
          const now = Date.now();
          await storageService.saveProviderConfig({
            ...config,
            lastValidatedAt: now,
            updatedAt: now,
            // Ensure createdAt exists
            createdAt: config.createdAt || now
          });
        }

        return result;
      } else if (config.providerType === 'openai') {
        provider = new OpenAIProvider();
        const result = await provider.validate(providerConfig);

        if (result.success) {
          const now = Date.now();
          await storageService.saveProviderConfig({
            ...config,
            lastValidatedAt: now,
            updatedAt: now,
            createdAt: config.createdAt || now
          });
        }

        return { valid: result.success, error: result.error };
      } else if (config.providerType === 'gemini') {
        provider = new GeminiProvider();
        const result = await provider.validate(providerConfig);

        if (result.success) {
          const now = Date.now();
          await storageService.saveProviderConfig({
            ...config,
            lastValidatedAt: now,
            updatedAt: now,
            createdAt: config.createdAt || now
          });
        }

        return { valid: result.success, error: result.error };
      }

      return {
        valid: false,
        error: 'Provider type not supported'
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  });

  // List providers
  ipcMain.handle(IPC_CHANNELS.LLM_PROVIDER_LIST, async (): Promise<ListProvidersResponse> => {
    try {
      const providers = await storageService.listProviderConfigs();
      return { providers };
    } catch (error) {
      return { providers: [] };
    }
  });

  // Delete provider
  ipcMain.handle(IPC_CHANNELS.LLM_PROVIDER_DELETE, async (_, request: DeleteProviderRequest): Promise<DeleteProviderResponse> => {
    try {
      await storageService.deleteProviderConfig(request.providerId);

      // Clear active provider if it was deleted
      if (activeProvider?.id === request.providerId) {
        activeProvider = null;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete provider'
      };
    }
  });
}

/**
 * LLM call handlers
 */
function registerCallHandlers(mainWindow: BrowserWindow): void {
  // Call LLM
  ipcMain.handle(IPC_CHANNELS.LLM_CALL, async (_, request: CallLLMRequest): Promise<CallLLMResponse> => {
    try {
      console.log('[LLM] Received LLM call request for prompt:', request.promptId);
      if (!activeProvider) {
        console.error('[LLM] No active provider configured');
        return {
          success: false,
          error: 'No active LLM provider configured'
        };
      }

      console.log('[LLM] Active provider:', activeProvider.providerType, activeProvider.displayName);
      
      // Substitute parameters
      const substituted = parameterService.substitute(request.promptContent, request.parameters);
      console.log('[LLM] Substituted content length:', substituted.length);

      // Check token limits
      const model = request.model || activeProvider.modelName || 'gemma3';
      const tokenCheck = tokenCounter.checkTokenLimit(
        substituted,
        activeProvider.providerType,
        model
      );

      if (!tokenCheck.withinLimit) {
        return {
          success: false,
          error: `Prompt exceeds token limit: ${tokenCheck.tokenCount} tokens (limit: ${tokenCheck.limit})`
        };
      }

      // Create request
      const llmRequest: LLMRequest = {
        id: uuidv4(),
        promptId: request.promptId,
        promptName: request.promptName,
        promptContent: substituted,
        parameters: request.parameters,
        provider: activeProvider.providerType,
        model,
        status: 'pending',
        createdAt: Date.now()
      };

      // Add to queue
      requestQueue.enqueue(llmRequest);
      console.log('[LLM] Request added to queue. Queue size:', requestQueue.size());

      // Emit queue updated event
      mainWindow.webContents.send(IPC_CHANNELS.LLM_QUEUE_UPDATED, {
        queueSize: requestQueue.size(),
        addedRequestId: llmRequest.id
      } as LLMQueueUpdatedEvent);
      console.log('[LLM] Queue updated event sent');

      // Start processing if not already processing
      if (!currentRequest) {
        console.log('[LLM] Starting request processing');
        processNextRequest(mainWindow);
      } else {
        console.log('[LLM] Request already processing, will wait in queue');
      }

      return {
        success: true,
        requestId: llmRequest.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue request'
      };
    }
  });

  // Cancel LLM request
  ipcMain.handle(IPC_CHANNELS.LLM_CANCEL, async (_, request: CancelLLMRequest): Promise<CancelLLMResponse> => {
    try {
      // If it's the current request, abort it
      if (currentRequest?.id === request.requestId) {
        if (processingAbortController) {
          processingAbortController.abort();
        }
        return { success: true };
      }

      // Otherwise, remove from queue
      const removed = requestQueue.remove(request.requestId);
      if (removed) {
        mainWindow.webContents.send(IPC_CHANNELS.LLM_QUEUE_UPDATED, {
          queueSize: requestQueue.size(),
          removedRequestId: request.requestId
        } as LLMQueueUpdatedEvent);
      }

      return { success: removed };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel request'
      };
    }
  });

  // Cancel all requests
  ipcMain.handle(IPC_CHANNELS.LLM_CANCEL_ALL, async (): Promise<CancelAllLLMResponse> => {
    try {
      const count = requestQueue.size() + (currentRequest ? 1 : 0);

      // Abort current request
      if (processingAbortController) {
        processingAbortController.abort();
      }

      // Clear queue
      requestQueue.clear();

      mainWindow.webContents.send(IPC_CHANNELS.LLM_QUEUE_UPDATED, {
        queueSize: 0
      } as LLMQueueUpdatedEvent);

      return {
        success: true,
        cancelledCount: count
      };
    } catch (error) {
      return {
        success: false,
        cancelledCount: 0,
        error: error instanceof Error ? error.message : 'Failed to cancel all'
      };
    }
  });
}

/**
 * Process next request in queue
 */
async function processNextRequest(mainWindow: BrowserWindow): Promise<void> {
  console.log('[LLM] processNextRequest called');
  // Get next request
  const request = requestQueue.dequeue();
  console.log('[LLM] Dequeued request:', request ? request.id : 'null');
  
  if (!request || !activeProvider) {
    console.log('[LLM] No request or no active provider, stopping');
    currentRequest = null;
    return;
  }

  currentRequest = request;
  console.log('[LLM] Processing request:', request.id);
  processingAbortController = new AbortController();

  // Update queue status after dequeue
  mainWindow.webContents.send(IPC_CHANNELS.LLM_QUEUE_UPDATED, {
    queueSize: requestQueue.size()
  } as LLMQueueUpdatedEvent);

  const startTime = Date.now();

  try {
    // Emit progress event
    mainWindow.webContents.send(IPC_CHANNELS.LLM_REQUEST_PROGRESS, {
      requestId: request.id,
      status: 'processing',
      elapsedMs: 0
    } as LLMRequestProgressEvent);

    // Create provider instance
    let provider;
    
    // Decrypt credentials if needed
    let decryptedKey = '';
    if (activeProvider.encryptedCredentials && credentialService.isAvailable()) {
      decryptedKey = credentialService.decryptCredential(activeProvider.encryptedCredentials);
    }
    
    const providerConfig: any = {
      providerType: activeProvider.providerType,
      baseURL: activeProvider.baseUrl,
      modelName: activeProvider.modelName,
      credentials: decryptedKey,
      timeoutSeconds: activeProvider.timeoutSeconds,
    };

    if (activeProvider.providerType === 'ollama') {
      const baseUrl = activeProvider.baseUrl || 'http://localhost:11434';
      provider = new OllamaProvider(baseUrl);
    } else if (activeProvider.providerType === 'openai') {
      provider = new OpenAIProvider();
    } else if (activeProvider.providerType === 'gemini') {
      provider = new GeminiProvider();
    } else {
      throw new Error(`Provider ${activeProvider.providerType} not supported`);
    }

    // Generate response
    let result;
    if (activeProvider.providerType === 'ollama') {
      result = await (provider as OllamaProvider).generate(request.promptContent, {
        model: request.model,
        signal: processingAbortController.signal
      });
    } else {
      // OpenAI and Gemini use the new provider config API
      result = await (provider as any).generate(providerConfig, request.promptContent);
    }

    const responseTime = Date.now() - startTime;

    // Save response
    const responseId = uuidv4();
    const responseMetadata: LLMResponseMetadata = {
      id: responseId,
      promptId: request.promptId,
      provider: request.provider,
      model: request.model,
      parameters: request.parameters,
      createdAt: Date.now(),
      responseTimeMs: responseTime,
      tokenUsage: result.tokenUsage,
      status: 'completed',
      filePath: '' // Will be set after saving
    };
    
    // Save content with frontmatter (includes prompt)
    const filePath = await storageService.saveResponseContent(
      request.promptId,
      request.promptName,
      responseId,
      result.content,
      responseMetadata,
      request.promptContent // Full substituted prompt for frontmatter
    );
    
    responseMetadata.filePath = filePath;
    await storageService.saveResponseMetadata(responseMetadata);

    // T035: Generate title for the response (BLOCKING)
    // Per spec requirement: LLM call #1 → title #1 → LLM call #2 → title #2
    // Title generation must complete before processing next queued LLM call
    if (titleService) {
      try {
        await titleService.generateTitle(responseId, result.content);
      } catch (err) {
        console.error(`[Title Generation] Failed for response ${responseId}:`, err);
      }
    }

    // Emit completion event
    mainWindow.webContents.send(IPC_CHANNELS.LLM_RESPONSE_COMPLETE, {
      requestId: request.id,
      responseId,
      promptId: request.promptId,
      status: 'completed'
    } as LLMResponseCompleteEvent);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Save error response
    const responseId = uuidv4();
    const errorMetadata: LLMResponseMetadata = {
      id: responseId,
      promptId: request.promptId,
      provider: request.provider,
      model: request.model,
      parameters: request.parameters,
      createdAt: Date.now(),
      responseTimeMs: Date.now() - startTime,
      status: errorMessage.includes('cancelled') ? 'cancelled' : 'failed',
      filePath: '', // Will be set after saving
      errorMessage
    };
    
    // Save error content with frontmatter (includes prompt)
    const filePath = await storageService.saveResponseContent(
      request.promptId,
      request.promptName,
      responseId,
      errorMessage,
      errorMetadata,
      request.promptContent // Full substituted prompt for frontmatter
    );
    
    errorMetadata.filePath = filePath;
    await storageService.saveResponseMetadata(errorMetadata);

    // Emit completion event
    mainWindow.webContents.send(IPC_CHANNELS.LLM_RESPONSE_COMPLETE, {
      requestId: request.id,
      responseId,
      promptId: request.promptId,
      status: errorMessage.includes('cancelled') ? 'cancelled' : 'failed',
      error: errorMessage
    } as LLMResponseCompleteEvent);
  } finally {
    currentRequest = null;
    processingAbortController = null;

    // Update queue status
    mainWindow.webContents.send(IPC_CHANNELS.LLM_QUEUE_UPDATED, {
      queueSize: requestQueue.size()
    } as LLMQueueUpdatedEvent);

    // Process next request if any
    if (!requestQueue.isEmpty()) {
      processNextRequest(mainWindow);
    }
  }
}

/**
 * Response management handlers
 */
function registerResponseHandlers(): void {
  // Get history
  ipcMain.handle(IPC_CHANNELS.LLM_GET_HISTORY, async (_, request: GetHistoryRequest): Promise<GetHistoryResponse> => {
    try {
      const responses = await storageService.listResponseMetadata(request.promptId);
      return { responses };
    } catch (error) {
      return { responses: [] };
    }
  });

  // Get response
  ipcMain.handle(IPC_CHANNELS.LLM_GET_RESPONSE, async (_, request: GetResponseRequest): Promise<GetResponseResponse> => {
    try {
      const metadata = await storageService.getResponseMetadata(request.responseId);
      if (!metadata) {
        return { error: 'Response not found' };
      }
      const content = await storageService.getResponseContent(metadata.filePath);
      return { response: { ...metadata, content } };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to load response' };
    }
  });

  // Delete response
  ipcMain.handle(IPC_CHANNELS.LLM_DELETE_RESPONSE, async (_, request: DeleteResponseRequest): Promise<DeleteResponseResponse> => {
    try {
      await storageService.deleteResponse(request.responseId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete response'
      };
    }
  });

  // Delete all responses for prompt
  ipcMain.handle(IPC_CHANNELS.LLM_DELETE_ALL_RESPONSES, async (_, request: DeleteAllResponsesRequest): Promise<DeleteAllResponsesResponse> => {
    try {
      await storageService.deleteAllResponses(request.promptId);
      return { success: true, count: 0 }; // Count not tracked by service
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Failed to delete responses'
      };
    }
  });
}

/**
 * Model management handlers
 */
function registerModelHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.LLM_MODELS_LIST, async (): Promise<ListModelsResponse> => {
    try {
      if (!activeProvider) {
        return {
          models: [],
          error: 'No active provider'
        };
      }

      let provider;
      
      // Decrypt credentials if needed
      let decryptedKey = '';
      if (activeProvider.encryptedCredentials && credentialService.isAvailable()) {
        decryptedKey = credentialService.decryptCredential(activeProvider.encryptedCredentials);
      }
      
      const providerConfig: any = {
        providerType: activeProvider.providerType,
        baseURL: activeProvider.baseUrl,
        modelName: activeProvider.modelName,
        credentials: decryptedKey,
        timeoutSeconds: activeProvider.timeoutSeconds,
      };

      if (activeProvider.providerType === 'ollama') {
        const baseUrl = activeProvider.baseUrl || 'http://localhost:11434';
        provider = new OllamaProvider(baseUrl);
        const modelNames = await provider.listModels();

        return {
          models: modelNames.map(name => ({
            id: name,
            name,
            provider: 'ollama' as const,
            contextWindow: 8192 // Default for Ollama
          }))
        };
      } else if (activeProvider.providerType === 'openai') {
        provider = new OpenAIProvider();
        const modelNames = await provider.listModels(providerConfig);

        return {
          models: modelNames.map(name => ({
            id: name,
            name,
            provider: 'openai' as const,
            contextWindow: name.includes('gpt-4') ? 128000 : 16384
          }))
        };
      } else if (activeProvider.providerType === 'gemini') {
        provider = new GeminiProvider();
        const modelNames = await provider.listModels(providerConfig);

        return {
          models: modelNames.map(name => ({
            id: name,
            name,
            provider: 'gemini' as const,
            contextWindow: name.includes('1.5') ? 1000000 : 32768
          }))
        };
      }

      return {
        models: [],
        error: 'Provider not supported'
      };
    } catch (error) {
      return {
        models: [],
        error: error instanceof Error ? error.message : 'Failed to list models'
      };
    }
  });
}

/**
 * Queue status handlers
 */
function registerQueueHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.LLM_GET_QUEUE_STATUS, async (): Promise<QueueStatusResponse> => {
    const response: QueueStatusResponse = {
      queueSize: requestQueue.size()
    };

    if (currentRequest) {
      response.currentRequest = {
        id: currentRequest.id,
        promptId: currentRequest.promptId,
        startedAt: currentRequest.createdAt,
        elapsedMs: Date.now() - currentRequest.createdAt
      };
    }

    return response;
  });
}

/**
 * T067-T068: Title generation configuration handlers
 */
function registerTitleConfigHandlers(): void {
  // Get title generation config
  ipcMain.handle(IPC_CHANNELS.LLM_TITLE_CONFIG_GET, async () => {
    try {
      const config = await storageService.getTitleGenerationConfig();
      return { success: true, config };
    } catch (error) {
      console.error('[Title Config] Failed to get config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get config'
      };
    }
  });

  // Set title generation config
  ipcMain.handle(IPC_CHANNELS.LLM_TITLE_CONFIG_SET, async (_, config: any) => {
    try {
      await storageService.updateTitleGenerationConfig(config);
      
      // Update TitleGenerationService configuration
      if (titleService) {
        titleService.updateConfig(config);
      }
      
      return { success: true };
    } catch (error) {
      console.error('[Title Config] Failed to set config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set config'
      };
    }
  });
}

/**
 * Cleanup on app quit
 */
export async function cleanupOnQuit(): Promise<void> {
  // Cancel current request
  if (processingAbortController) {
    processingAbortController.abort();
  }

  // Clear queue
  requestQueue.clear();

  // Mark any pending requests as cancelled
  await storageService.markPendingAsCancelled();
}

