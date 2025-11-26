/**
 * React 앱 메인 컴포넌트
 */

import React, { useEffect } from 'react';
import { Layout } from '@renderer/components/layout/Layout';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useLLMStore } from '@renderer/stores/useLLMStore';
import { useTranslation } from 'react-i18next';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { useLLMEvents } from '@renderer/hooks/useLLMEvents';
import './i18n'; // i18n 초기화
import './styles/globals.css';

const App: React.FC = () => {
  const { updateSettings, settings } = useAppStore();
  const { setProviders, setActiveProvider } = useLLMStore();
  const { i18n } = useTranslation();

  // Set up LLM event listeners
  useLLMEvents();

  // 언어 설정 동기화
  useEffect(() => {
    if (settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n]);

  // 앱 시작 시 메인 프로세스의 프로젝트 경로와 동기화
  useEffect(() => {
    const syncProjectPath = async () => {
      try {
        const result = await window.electronAPI.invoke('settings:getProjectPath');
        if (result.success && result.data) {
          // 메인 프로세스에 저장된 경로로 렌더러 설정 업데이트
          updateSettings({ projectPath: result.data });
          console.log('Project path synchronized from main process:', result.data);
        }
      } catch (error) {
        console.error('Failed to sync project path:', error);
      }
    };

    syncProjectPath();
  }, [updateSettings]);

  // Load LLM providers on app startup
  useEffect(() => {
    const loadLLMProviders = async () => {
      try {
        const response = await window.electronAPI.invoke(IPC_CHANNELS.LLM_PROVIDER_LIST);
        if (response.providers) {
          console.log('Loaded LLM providers:', response.providers);
          setProviders(response.providers);
          const active = response.providers.find((p: any) => p.isActive);
          if (active) {
            console.log('Active provider:', active);
            setActiveProvider(active);
          }
        }
      } catch (error) {
        console.error('Failed to load LLM providers:', error);
      }
    };

    loadLLMProviders();
  }, [setProviders, setActiveProvider]);

  return <Layout />;
};

export default App;
