/**
 * React 앱 메인 컴포넌트
 */

import React, { useEffect } from 'react';
import { Layout } from '@renderer/components/layout/Layout';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useTranslation } from 'react-i18next';
import './i18n'; // i18n 초기화
import './styles/globals.css';

const App: React.FC = () => {
  const { updateSettings, settings } = useAppStore();
  const { i18n } = useTranslation();
  
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
  
  return <Layout />;
};

export default App;
