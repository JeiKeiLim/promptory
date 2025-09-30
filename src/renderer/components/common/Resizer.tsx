/**
 * 패널 크기 조절을 위한 리사이저 컴포넌트
 */

import React, { useState, useCallback } from 'react';

interface ResizerProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  className?: string;
}

export const Resizer: React.FC<ResizerProps> = ({
  direction,
  onResize,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartPosition(direction === 'horizontal' ? e.clientX : e.clientY);
    
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const currentPosition = direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPosition - startPosition;
    
    onResize(delta);
    setStartPosition(currentPosition);
  }, [isDragging, direction, startPosition, onResize]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [isDragging]);

  // 전역 마우스 이벤트 등록
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`${className} ${isDragging ? 'bg-blue-300' : ''}`}
      onMouseDown={handleMouseDown}
      style={{
        cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize'
      }}
    />
  );
};

