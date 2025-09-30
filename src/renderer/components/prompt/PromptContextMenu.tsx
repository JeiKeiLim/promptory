/**
 * 프롬프트 컨텍스트 메뉴 컴포넌트
 */

import React from 'react';

interface PromptContextMenuProps {
  promptId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export const PromptContextMenu: React.FC<PromptContextMenuProps> = ({
  promptId,
  position,
  onClose
}) => {
  // 클릭 외부 감지
  React.useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
      style={{
        left: position.x,
        top: position.y
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
        편집
      </button>
      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
        복제
      </button>
      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
        즐겨찾기 토글
      </button>
      <hr className="my-1" />
      <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100">
        삭제
      </button>
    </div>
  );
};

