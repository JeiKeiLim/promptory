/**
 * Title Generation Settings Component
 * 
 * Allows users to configure title generation:
 * - Enable/disable toggle
 * - Model selection
 * - Provider selection  
 * - Timeout configuration
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { TitleGenerationConfig } from '@shared/types/llm';
import { toast } from '@renderer/components/common/ToastContainer';

export const TitleGenerationSettings: React.FC = () => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<TitleGenerationConfig>({
    enabled: true,
    selectedModel: 'gemma3:1b',
    selectedProvider: 'ollama',
    timeoutSeconds: 30
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.invoke(IPC_CHANNELS.LLM_TITLE_CONFIG_GET, {});
      if (result.success && result.config) {
        setConfig(result.config);
      }
    } catch (error) {
      console.error('Failed to load title config:', error);
      toast.error(t('settings.title.loadError') || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const result = await window.electronAPI.invoke(IPC_CHANNELS.LLM_TITLE_CONFIG_SET, config);
      if (result.success) {
        toast.success(t('settings.title.saved') || 'Title generation settings saved');
      } else {
        toast.error(result.error || t('settings.title.saveError') || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save title config:', error);
      toast.error(t('settings.title.saveError') || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {t('settings.title.heading') || 'Automatic Title Generation'}
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {t('settings.title.description') || 'Automatically generate descriptive titles for LLM responses'}
        </p>
      </div>

      {/* T078: Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">
            {t('settings.title.enabled') || 'Enable Title Generation'}
          </label>
          <p className="text-xs text-gray-500 mt-1">
            {t('settings.title.enabledDesc') || 'Generate titles automatically for all responses'}
          </p>
        </div>
        <button
          type="button"
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
          onClick={() => setConfig({ ...config, enabled: !config.enabled })}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* T079: Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('settings.title.model') || 'Title Generation Model'}
        </label>
        <input
          type="text"
          value={config.selectedModel}
          onChange={(e) => setConfig({ ...config, selectedModel: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="gemma3:1b"
          disabled={!config.enabled}
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('settings.title.modelDesc') || 'Lighter models recommended for faster titles'}
        </p>
      </div>

      {/* T080: Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('settings.title.provider') || 'Provider'}
        </label>
        <select
          value={config.selectedProvider}
          onChange={(e) => setConfig({ ...config, selectedProvider: e.target.value as any })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!config.enabled}
        >
          <option value="ollama">Ollama</option>
          <option value="openai">OpenAI</option>
          <option value="gemini">Gemini</option>
        </select>
      </div>

      {/* T081: Timeout Configuration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('settings.title.timeout') || 'Timeout (seconds)'}
        </label>
        <input
          type="number"
          min="10"
          max="120"
          value={config.timeoutSeconds}
          onChange={(e) => setConfig({ ...config, timeoutSeconds: parseInt(e.target.value) || 30 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!config.enabled}
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('settings.title.timeoutDesc') || 'Between 10 and 120 seconds'}
        </p>
      </div>

      {/* T082: Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save Changes')}
        </button>
      </div>
    </div>
  );
};
