/**
 * 커스텀 타이틀바 컴포넌트
 */

import React from 'react';
import { 
  MinusIcon, 
  Square2StackIcon, 
  XMarkIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '@renderer/stores/useAppStore';

export const TitleBar: React.FC = () => {
  const { showSettingsModal } = useAppStore();

  const handleMinimize = () => {
    window.electronAPI?.windowControl?.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.windowControl?.maximize();
  };

  const handleClose = () => {
    window.electronAPI?.windowControl?.close();
  };

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div 
      className="h-10 theme-bg-primary theme-border-primary border-b flex items-center select-none"
      style={{ 
        // 전체 영역을 드래그 가능하게 설정
        WebkitAppRegion: 'drag'
      }}
    >
      {isMac ? (
        // macOS: 좌측에 여백을 두고 중앙에 앱 정보 배치
        <>
          {/* 좌측: macOS 창 조절 아이콘을 위한 여백 */}
          <div className="w-20"></div>
          
          {/* 중앙: 앱 정보 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">P</span>
              </div>
              <span className="text-sm font-medium theme-text-primary">Promptory</span>
            </div>
          </div>
          
          {/* 우측: 설정 버튼 */}
          <div 
            className="flex items-center pr-4"
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            <button
              onClick={() => showSettingsModal()}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              title="설정"
            >
              <Cog6ToothIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </>
      ) : (
        // Windows/Linux: 기존 레이아웃 유지
        <>
          {/* 좌측: 앱 정보 */}
          <div className="flex items-center space-x-3 pl-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">P</span>
              </div>
              <span className="text-sm font-medium theme-text-primary">Promptory</span>
            </div>
          </div>

          {/* 중앙: 빈 공간 */}
          <div className="flex-1"></div>

          {/* 우측: 컨트롤 버튼 */}
          <div 
            className="flex items-center space-x-1 pr-4"
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            {/* 설정 버튼 */}
            <button
              onClick={() => showSettingsModal()}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              title="설정"
            >
              <Cog6ToothIcon className="w-4 h-4 text-gray-600" />
            </button>

            {/* Windows/Linux 창 조절 버튼 */}
            <div className="flex items-center ml-2">
              <button
                onClick={handleMinimize}
                className="p-1.5 hover:bg-gray-100 transition-colors"
                title="최소화"
              >
                <MinusIcon className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={handleMaximize}
                className="p-1.5 hover:bg-gray-100 transition-colors"
                title="최대화"
              >
                <Square2StackIcon className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-red-500 hover:text-white transition-colors"
                title="닫기"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
