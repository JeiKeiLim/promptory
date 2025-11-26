/**
 * 설정 모달 컴포넌트
 */

import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '@renderer/stores/useAppStore';
import { GeneralSettings } from './GeneralSettings';
import { EditorSettings } from './EditorSettings';
import { SearchSettings } from './SearchSettings';
import { ShortcutSettings } from './ShortcutSettings';
import { WindowSettings } from './WindowSettings';
import { LLMSettings } from './LLMSettings';
import { TitleGenerationSettings } from './TitleGenerationSettings';
import { useTranslation } from 'react-i18next';

export const SettingsModal: React.FC = () => {
  const { t } = useTranslation();
  const { settingsModal, hideSettingsModal, setSettingsTab } = useAppStore();

  if (!settingsModal.isOpen) return null;

  const tabs = [
    { id: 'general', label: t('settings.general'), icon: '⚙️' },
    { id: 'editor', label: t('settings.editor'), icon: '📝' },
    { id: 'search', label: t('settings.search'), icon: '🔍' },
    { id: 'shortcuts', label: t('settings.shortcuts'), icon: '⌨️' },
    { id: 'window', label: t('settings.window'), icon: '🖥️' },
    { id: 'llm', label: t('settings.llm'), icon: '🤖' },
    { id: 'titleGen', label: t('settings.titleGen') || 'Title Generation', icon: '📝' }
  ] as const;

  const renderTabContent = () => {
    switch (settingsModal.activeTab) {
      case 'general':
        return <GeneralSettings />;
      case 'editor':
        return <EditorSettings />;
      case 'search':
        return <SearchSettings />;
      case 'shortcuts':
        return <ShortcutSettings />;
      case 'window':
        return <WindowSettings />;
      case 'llm':
        return <LLMSettings />;
      case 'titleGen':
        return <TitleGenerationSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 modal-backdrop bg-black bg-opacity-50"
      onClick={(e) => {
        // 배경 클릭 시 모달 닫기
        if (e.target === e.currentTarget) {
          hideSettingsModal();
        }
      }}
    >
      <div className="bg-white border border-gray-200 rounded-lg w-full max-w-4xl h-[600px] flex overflow-hidden modal-content shadow-xl">
        {/* 사이드바 */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* 헤더 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('settings.settingsTitle')}
              </h2>
              <button
                onClick={hideSettingsModal}
                className="p-1 text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 탭 목록 */}
          <div className="flex-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                  settingsModal.activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600 font-medium'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col bg-white">
          {/* 콘텐츠 헤더 */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">
              {tabs.find(tab => tab.id === settingsModal.activeTab)?.label}
            </h3>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 p-6 overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
