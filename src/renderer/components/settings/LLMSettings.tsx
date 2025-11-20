/**
 * LLM Settings Component
 * 
 * Allows users to configure LLM providers (Ollama, OpenAI, Azure, Gemini)
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLLMStore } from '@renderer/stores/useLLMStore';
import { LLMProviderConfig, LLMProviderType } from '@shared/types/llm';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';

export const LLMSettings: React.FC = () => {
  const { t } = useTranslation();
  const { providers, activeProvider, setProviders, setActiveProvider } = useLLMStore();

  const [selectedProvider, setSelectedProvider] = useState<LLMProviderType>('ollama');
  const [displayName, setDisplayName] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [modelName, setModelName] = useState('gemma3');
  const [apiKey, setApiKey] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState(120);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message?: string; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Load providers on mount
  useEffect(() => {
    loadProviders();
  }, []);

  // Update form when active provider changes
  useEffect(() => {
    if (activeProvider) {
      setSelectedProvider(activeProvider.providerType);
      setDisplayName(activeProvider.displayName);
      setBaseUrl(activeProvider.baseUrl || 'http://localhost:11434');
      setModelName(activeProvider.modelName || 'gemma3');
      setTimeoutSeconds(activeProvider.timeoutSeconds || 120);
    }
  }, [activeProvider]);

  const loadProviders = async () => {
    try {
      const response = await window.electronAPI.invoke(IPC_CHANNELS.LLM_PROVIDER_LIST);
      if (response.providers) {
        setProviders(response.providers);
        const active = response.providers.find((p: LLMProviderConfig) => p.isActive);
        if (active) {
          setActiveProvider(active);
        }
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const handleProviderTypeChange = (type: LLMProviderType) => {
    setSelectedProvider(type);
    setValidationResult(null);

    // Set defaults based on provider type
    switch (type) {
      case 'ollama':
        setBaseUrl('http://localhost:11434');
        setModelName('gemma3');
        setDisplayName('Ollama (Local)');
        setTimeoutSeconds(120);
        break;
      case 'openai':
        setBaseUrl('https://api.openai.com/v1');
        setModelName('gpt-4');
        setDisplayName('OpenAI');
        setTimeoutSeconds(60);
        break;
      case 'azure_openai':
        setBaseUrl('');
        setModelName('gpt-4');
        setDisplayName('Azure OpenAI');
        setTimeoutSeconds(60);
        break;
      case 'gemini':
        setBaseUrl('https://generativelanguage.googleapis.com');
        setModelName('gemini-pro');
        setDisplayName('Google Gemini');
        setTimeoutSeconds(60);
        break;
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);

    try {
      // First save the configuration
      const saveResponse = await window.electronAPI.invoke(IPC_CHANNELS.LLM_PROVIDER_SAVE, {
        config: {
          id: activeProvider?.id || undefined,
          providerType: selectedProvider,
          displayName,
          baseUrl: selectedProvider === 'ollama' || selectedProvider === 'azure_openai' ? baseUrl : undefined,
          modelName,
          timeoutSeconds,
          isActive: false // Don't activate yet
        },
        credentials: apiKey || undefined
      });

      if (!saveResponse.success) {
        setValidationResult({
          valid: false,
          error: saveResponse.error || 'Failed to save configuration'
        });
        return;
      }

      // Then validate it
      const validateResponse = await window.electronAPI.invoke(IPC_CHANNELS.LLM_PROVIDER_VALIDATE, {
        providerId: saveResponse.config.id
      });

      setValidationResult(validateResponse);
    } catch (error) {
      setValidationResult({
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await window.electronAPI.invoke(IPC_CHANNELS.LLM_PROVIDER_SAVE, {
        config: {
          id: activeProvider?.id || undefined,
          providerType: selectedProvider,
          displayName,
          baseUrl: selectedProvider === 'ollama' || selectedProvider === 'azure_openai' ? baseUrl : undefined,
          modelName,
          timeoutSeconds,
          isActive: true
        },
        credentials: apiKey || undefined
      });

      if (response.success && response.config) {
        // Set as active
        await window.electronAPI.invoke(IPC_CHANNELS.LLM_PROVIDER_SET_ACTIVE, {
          providerId: response.config.id
        });

        // Reload providers
        await loadProviders();

        setValidationResult({
          valid: true,
          message: t('llm.provider.saveSuccess')
        });
      } else {
        setValidationResult({
          valid: false,
          error: response.error || 'Failed to save configuration'
        });
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to save'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          {t('llm.provider.settings')}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure your LLM provider settings
        </p>
      </div>

      {/* Provider Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('llm.provider.selectProvider')}
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => handleProviderTypeChange(e.target.value as LLMProviderType)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="ollama">{t('llm.provider.ollama')}</option>
          <option value="openai">{t('llm.provider.openai')}</option>
          <option value="azure_openai">{t('llm.provider.azureOpenai')}</option>
          <option value="gemini">{t('llm.provider.gemini')}</option>
        </select>
      </div>

      {/* Display Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Base URL (for Ollama and Azure) */}
      {(selectedProvider === 'ollama' || selectedProvider === 'azure_openai') && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('llm.provider.baseUrl')}
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={t('llm.provider.baseUrlPlaceholder')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Model Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('llm.provider.modelName')}
        </label>
        <input
          type="text"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder={t('llm.provider.modelPlaceholder')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* API Key (for OpenAI, Azure, Gemini) */}
      {selectedProvider !== 'ollama' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('llm.provider.apiKey')}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('llm.provider.apiKeyPlaceholder')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Timeout */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('llm.provider.timeout')}
        </label>
        <input
          type="number"
          value={timeoutSeconds}
          onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 120)}
          min="10"
          max="600"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className={`p-4 rounded-md ${
          validationResult.valid
            ? 'bg-green-50 text-green-800'
            : 'bg-red-50 text-red-800'
        }`}>
          {validationResult.valid ? validationResult.message : validationResult.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleValidate}
          disabled={validating}
          className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
          {validating ? t('llm.provider.validating') : t('llm.provider.testConnection')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !validationResult?.valid}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : t('llm.provider.save')}
        </button>
      </div>
    </div>
  );
};
