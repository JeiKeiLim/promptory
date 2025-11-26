/**
 * Unified LLM Settings Component
 * 
 * Consolidated interface for configuring LLM provider, LLM call settings,
 * and title generation settings in a single location.
 * 
 * Phase 3 GREEN: Implementation to pass tests
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LLMProviderType, UnifiedLLMConfig } from '@shared/types/llm';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { validateUnifiedLLMConfig, hasValidationErrors, ValidationErrors } from '@renderer/utils/validation';

const DEFAULT_UNIFIED_CONFIG: UnifiedLLMConfig = {
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

export const LLMSettings: React.FC = () => {
  const { t } = useTranslation();

  // State for unified configuration
  const [provider, setProvider] = useState<LLMProviderType>('ollama');
  const [llmModel, setLlmModel] = useState('gemma3');
  const [llmTimeout, setLlmTimeout] = useState(60);
  const [titleEnabled, setTitleEnabled] = useState(true);
  const [titleModel, setTitleModel] = useState('gemma3:1b');
  const [titleTimeout, setTitleTimeout] = useState(30);

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load unified config on mount
  useEffect(() => {
    loadUnifiedConfig();
  }, []);

  const loadUnifiedConfig = async () => {
    try {
      const response = await window.electronAPI.invoke(IPC_CHANNELS.LLM_UNIFIED_CONFIG_GET);
      
      if (response.success && response.config) {
        const config = response.config as UnifiedLLMConfig;
        setProvider(config.provider);
        setLlmModel(config.llmCall.model);
        setLlmTimeout(config.llmCall.timeout);
        setTitleEnabled(config.titleGeneration.enabled);
        setTitleModel(config.titleGeneration.model);
        setTitleTimeout(config.titleGeneration.timeout);
      } else {
        // Apply defaults if no config exists
        const defaults = DEFAULT_UNIFIED_CONFIG;
        setProvider(defaults.provider);
        setLlmModel(defaults.llmCall.model);
        setLlmTimeout(defaults.llmCall.timeout);
        setTitleEnabled(defaults.titleGeneration.enabled);
        setTitleModel(defaults.titleGeneration.model);
        setTitleTimeout(defaults.titleGeneration.timeout);
      }
    } catch (error) {
      console.error('Failed to load unified config:', error);
      // Apply defaults on error
      const defaults = DEFAULT_UNIFIED_CONFIG;
      setProvider(defaults.provider);
      setLlmModel(defaults.llmCall.model);
      setLlmTimeout(defaults.llmCall.timeout);
      setTitleEnabled(defaults.titleGeneration.enabled);
      setTitleModel(defaults.titleGeneration.model);
      setTitleTimeout(defaults.titleGeneration.timeout);
    }
  };

  // Validation function
  const validateConfig = (): boolean => {
    const errors = validateUnifiedLLMConfig({
      llmModel,
      llmTimeout,
      titleModel,
      titleTimeout
    });
    
    setValidationErrors(errors);
    return !hasValidationErrors(errors);
  };

  // Run validation when inputs change
  useEffect(() => {
    validateConfig();
  }, [llmModel, llmTimeout, titleModel, titleTimeout]);

  const handleProviderChange = (newProvider: LLMProviderType) => {
    setProvider(newProvider);
    
    // Set default models based on provider
    switch (newProvider) {
      case 'ollama':
        if (!llmModel) setLlmModel('gemma3');
        if (!titleModel) setTitleModel('gemma3:1b');
        break;
      case 'openai':
        if (!llmModel) setLlmModel('gpt-4');
        if (!titleModel) setTitleModel('gpt-3.5-turbo');
        break;
      case 'azure_openai':
        if (!llmModel) setLlmModel('gpt-4');
        if (!titleModel) setTitleModel('gpt-3.5-turbo');
        break;
      case 'gemini':
        if (!llmModel) setLlmModel('gemini-pro');
        if (!titleModel) setTitleModel('gemini-pro');
        break;
    }
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const config: UnifiedLLMConfig = {
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

      const response = await window.electronAPI.invoke(
        IPC_CHANNELS.LLM_UNIFIED_CONFIG_SAVE,
        { config }
      );

      if (response.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(response.error || 'Failed to save configuration');
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = !hasValidationErrors(validationErrors);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          {t('llm.settings.title', 'LLM Settings')}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('llm.settings.description', 'Configure LLM provider and settings for calls and title generation')}
        </p>
      </div>

      {/* Provider Selection - At Top */}
      <div>
        <label htmlFor="provider-select" className="block text-sm font-medium text-gray-700">
          {t('llm.provider.label', 'Provider')}
        </label>
        <select
          id="provider-select"
          name="provider"
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value as LLMProviderType)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="ollama">{t('llm.provider.ollama', 'Ollama')}</option>
          <option value="openai">{t('llm.provider.openai', 'OpenAI')}</option>
          <option value="azure_openai">{t('llm.provider.azureOpenai', 'Azure OpenAI')}</option>
          <option value="gemini">{t('llm.provider.gemini', 'Google Gemini')}</option>
        </select>
      </div>

      {/* LLM Call Settings Section */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-base font-medium text-gray-900 mb-4">
          {t('llm.settings.llmCall', 'LLM Call Settings')}
        </h4>

        <div className="space-y-4">
          {/* LLM Model */}
          <div>
            <label htmlFor="llm-model" className="block text-sm font-medium text-gray-700">
              {t('llm.settings.llmModel', 'LLM Model')}
            </label>
            <input
              id="llm-model"
              type="text"
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.llmModel ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {validationErrors.llmModel && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.llmModel}</p>
            )}
          </div>

          {/* LLM Timeout */}
          <div>
            <label htmlFor="llm-timeout" className="block text-sm font-medium text-gray-700">
              {t('llm.settings.llmTimeout', 'LLM Timeout (seconds)')}
            </label>
            <input
              id="llm-timeout"
              type="number"
              min="1"
              max="999"
              value={llmTimeout}
              onChange={(e) => setLlmTimeout(parseInt(e.target.value) || 60)}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.llmTimeout ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {validationErrors.llmTimeout && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.llmTimeout}</p>
            )}
          </div>
        </div>
      </div>

      {/* Title Generation Settings Section */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-base font-medium text-gray-900 mb-4">
          {t('llm.settings.titleGeneration', 'Title Generation Settings')}
        </h4>

        <div className="space-y-4">
          {/* Enable Title Generation */}
          <div className="flex items-center">
            <input
              id="title-enabled"
              type="checkbox"
              checked={titleEnabled}
              onChange={(e) => setTitleEnabled(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="title-enabled" className="ml-2 block text-sm text-gray-700">
              {t('llm.settings.enableTitle', 'Enable automatic title generation')}
            </label>
          </div>

          {/* Title Model */}
          <div>
            <label htmlFor="title-model" className="block text-sm font-medium text-gray-700">
              {t('llm.settings.titleModel', 'Title Generation Model')}
            </label>
            <input
              id="title-model"
              type="text"
              value={titleModel}
              onChange={(e) => setTitleModel(e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.titleModel ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {validationErrors.titleModel && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.titleModel}</p>
            )}
          </div>

          {/* Title Timeout */}
          <div>
            <label htmlFor="title-timeout" className="block text-sm font-medium text-gray-700">
              {t('llm.settings.titleTimeout', 'Title Generation Timeout (seconds)')}
            </label>
            <input
              id="title-timeout"
              type="number"
              min="1"
              max="999"
              value={titleTimeout}
              onChange={(e) => setTitleTimeout(parseInt(e.target.value) || 30)}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.titleTimeout ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {validationErrors.titleTimeout && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.titleTimeout}</p>
            )}
          </div>
        </div>
      </div>

      {/* Save Success/Error Messages */}
      {saveSuccess && (
        <div className="p-4 rounded-md bg-green-50">
          <p className="text-sm text-green-800">
            {t('llm.settings.saveSuccess', 'Configuration saved successfully')}
          </p>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-md bg-red-50">
          <p className="text-sm text-red-800">{saveError}</p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!isFormValid || saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t('llm.settings.saving', 'Saving...') : t('llm.settings.save', 'Save')}
        </button>
      </div>
    </div>
  );
};
