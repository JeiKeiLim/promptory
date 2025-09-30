/**
 * 일반 설정 탭
 */

import React from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';
import { toast } from '@renderer/components/common/ToastContainer';

export const GeneralSettings: React.FC = () => {
  const { settings, updateSettings } = useAppStore();

  const handleLanguageChange = (language: 'ko' | 'en' | 'ja') => {
    updateSettings({ language });
  };

  const handleFontSizeChange = (fontSize: number) => {
    updateSettings({ fontSize });
  };

  const handleAutoSaveChange = (autoSave: boolean) => {
    updateSettings({ autoSave });
  };

  const handleAutoSaveIntervalChange = (autoSaveInterval: number) => {
    updateSettings({ autoSaveInterval });
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
          toast.success('프로젝트 경로가 변경되었습니다. 프롬프트 목록이 새로고침됩니다.');
          
          // 프롬프트 목록 새로고침
          window.location.reload();
        } else {
          toast.error('프로젝트 경로 변경에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
      toast.error('폴더 선택 중 오류가 발생했습니다.');
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
          프롬프트 저장 위치
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
            변경
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          프롬프트 파일이 저장될 폴더를 선택합니다. 변경 후 앱을 재시작해야 적용됩니다.
        </p>
      </div>

      {/* 언어 설정 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          언어
        </label>
        <select
          value={settings.language}
          onChange={(e) => handleLanguageChange(e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>

      {/* 폰트 크기 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          폰트 크기: {settings.fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="24"
          step="1"
          value={settings.fontSize}
          onChange={(e) => handleFontSizeChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>12px</span>
          <span>18px</span>
          <span>24px</span>
        </div>
      </div>

      {/* 자동 저장 */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              자동 저장
            </label>
            <p className="text-xs text-gray-500">
              편집 중인 프롬프트를 자동으로 저장합니다
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoSave}
            onChange={(e) => handleAutoSaveChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>

        {settings.autoSave && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              자동 저장 간격: {settings.autoSaveInterval}초
            </label>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={settings.autoSaveInterval}
              onChange={(e) => handleAutoSaveIntervalChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10초</span>
              <span>2분</span>
              <span>5분</span>
            </div>
          </div>
        )}
      </div>

      {/* 모달 자동 닫기 */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              모달 자동 닫기
            </label>
            <p className="text-xs text-gray-500">
              작업 완료 후 모달을 자동으로 닫습니다
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
        <h4 className="text-sm font-medium text-gray-700 mb-3">앱 정보</h4>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">앱 이름:</span>
            <span className="text-gray-900">Promptory</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">버전:</span>
            <span className="text-gray-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">플랫폼:</span>
            <span className="text-gray-900">{navigator.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">사용자 에이전트:</span>
            <span className="text-gray-900 text-xs break-all">{navigator.userAgent.split(' ')[0]}</span>
          </div>
        </div>
      </div>
    </div>
  );
};