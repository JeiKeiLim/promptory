/**
 * 윈도우 설정 탭
 */

import React from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useTranslation } from 'react-i18next';

export const WindowSettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();

  // 안전한 기본값 설정
  const windowSettings = settings.window || {
    rememberSize: true,
    startMaximized: false
  };

  const handleRememberSizeChange = (rememberSize: boolean) => {
    updateSettings({
      window: { ...windowSettings, rememberSize }
    });
  };

  const handleStartMaximizedChange = (startMaximized: boolean) => {
    updateSettings({
      window: { ...windowSettings, startMaximized }
    });
  };

  return (
    <div className="space-y-6" style={{ color: 'var(--color-text-primary, #111827)' }}>
      {/* 윈도우 크기 기억 */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              {t('settings.rememberSize')}
            </label>
          </div>
          <input
            type="checkbox"
            checked={windowSettings.rememberSize}
            onChange={(e) => handleRememberSizeChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 시작 시 최대화 */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              {t('settings.startMaximized')}
            </label>
          </div>
          <input
            type="checkbox"
            checked={windowSettings.startMaximized}
            onChange={(e) => handleStartMaximizedChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 윈도우 제어 */}
      <div className="border-t pt-6">
        <div className="space-y-3">
          <button
            onClick={async () => {
              await window.electronAPI.invoke('window:center');
            }}
            className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {t('settings.centerWindow')}
          </button>
          
          <button
            onClick={async () => {
              await window.electronAPI.invoke('window:setSize', { width: 1200, height: 800 });
            }}
            className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {t('settings.resetSize')}
          </button>
        </div>
      </div>

    </div>
  );
};
