/**
 * 윈도우 설정 탭
 */

import React from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';

export const WindowSettings: React.FC = () => {
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
              윈도우 크기 기억
            </label>
            <p className="text-xs text-gray-500">
              앱을 다시 시작할 때 이전 윈도우 크기를 복원합니다
            </p>
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
              시작 시 최대화
            </label>
            <p className="text-xs text-gray-500">
              앱 시작 시 윈도우를 최대화된 상태로 엽니다
            </p>
          </div>
          <input
            type="checkbox"
            checked={windowSettings.startMaximized}
            onChange={(e) => handleStartMaximizedChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 현재 윈도우 정보 */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">현재 윈도우 정보</h4>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">크기:</span>
            <span className="text-gray-900">{window.innerWidth} × {window.innerHeight}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">화면 해상도:</span>
            <span className="text-gray-900">{window.screen.width} × {window.screen.height}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">디바이스 픽셀 비율:</span>
            <span className="text-gray-900">{window.devicePixelRatio}x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">플랫폼:</span>
            <span className="text-gray-900">{navigator.platform}</span>
          </div>
        </div>
      </div>

      {/* 윈도우 제어 */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">윈도우 제어</h4>
        <div className="space-y-3">
          <button
            onClick={() => {
              // 향후 IPC를 통해 메인 프로세스에 윈도우 중앙 정렬 요청
              console.log('Center window requested');
            }}
            className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            윈도우 중앙 정렬
          </button>
          
          <button
            onClick={() => {
              // 향후 IPC를 통해 메인 프로세스에 기본 크기 복원 요청
              console.log('Reset window size requested');
            }}
            className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            기본 크기로 복원 (1200×800)
          </button>
        </div>
      </div>

      {/* 다중 모니터 지원 */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">다중 모니터 지원</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>윈도우 위치는 자동으로 기억됩니다</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>모니터가 연결 해제되면 기본 모니터로 이동합니다</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>각 모니터의 DPI 설정이 자동으로 적용됩니다</span>
          </div>
        </div>
      </div>

      {/* 고급 윈도우 기능 (향후 확장용) */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">고급 기능</h4>
        <div className="space-y-2 text-sm text-gray-500">
          <p>• 윈도우 투명도 설정</p>
          <p>• 항상 위에 표시</p>
          <p>• 최소 트레이 모드</p>
          <p>• 전체화면 모드</p>
          <p className="text-xs italic">이 기능들은 향후 업데이트에서 제공될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
};
