/**
 * 일반 설정 탭
 */

import React from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';
import { toast } from '@renderer/components/common/ToastContainer';
import { useTranslation } from 'react-i18next';

export const GeneralSettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();

  const handleLanguageChange = (language: 'ko' | 'en' | 'ja') => {
    updateSettings({ language });
  };

  const handleAutoCloseModalChange = (autoCloseModal: boolean) => {
    updateSettings({ autoCloseModal });
  };

  const handleProjectPathChange = async () => {
    try {
      const result = await window.electronAPI.invoke('dialog:selectFolder');
      if (result.success && result.data) {
        // 메인 프로세스에 설정 저장
        const setResult = await window.electronAPI.invoke('settings:setProjectPath', result.data);
        
        if (setResult.success) {
          // 렌더러 설정도 업데이트
          updateSettings({ projectPath: result.data });
          toast.success(t('settings.pathChangeSuccess'));
          
          // 프롬프트 목록 새로고침
          window.location.reload();
        } else {
          toast.error(t('settings.pathChangeFailed'));
        }
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
      toast.error(t('settings.folderSelectError'));
    }
  };

  const getDisplayPath = () => {
    const path = settings.projectPath || '~/Promptory';
    
    // 이미 ~ 로 시작하면 그대로 반환
    if (path.startsWith('~')) {
      return path;
    }
    
    // /Users/username 형태를 ~ 로 변환
    // 렌더러에서는 직접적인 홈 디렉토리 경로를 알 수 없으므로
    // /Users/로 시작하는 경로는 그대로 표시
    return path;
  };

  return (
    <div className="space-y-6">
      {/* 프롬프트 저장 위치 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('settings.projectPath')}
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={getDisplayPath()}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
          />
          <button
            onClick={handleProjectPathChange}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {t('settings.change')}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {t('settings.pathChangeNote')}
        </p>
      </div>

      {/* 언어 설정 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('settings.language')}
        </label>
        <select
          value={settings.language}
          onChange={(e) => handleLanguageChange(e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="ko">{t('settings.korean')}</option>
          <option value="en">{t('settings.english')}</option>
          <option value="ja">{t('settings.japanese')}</option>
        </select>
      </div>

      {/* 모달 자동 닫기 */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              {t('settings.autoCloseModal')}
            </label>
            <p className="text-xs text-gray-500">
              {t('settings.autoCloseModalDesc')}
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoCloseModal}
            onChange={(e) => handleAutoCloseModalChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 앱 정보 */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">{t('settings.appInfo')}</h4>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('settings.appNameLabel')}:</span>
            <span className="text-gray-900">Promptory</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('settings.version')}:</span>
            <span className="text-gray-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('settings.platform')}:</span>
            <span className="text-gray-900">{navigator.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('settings.userAgent')}:</span>
            <span className="text-gray-900 text-xs break-all">{navigator.userAgent.split(' ')[0]}</span>
          </div>
        </div>
      </div>
    </div>
  );
};