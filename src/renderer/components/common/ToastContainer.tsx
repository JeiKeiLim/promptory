/**
 * 토스트 알림 컨테이너
 */

import React from 'react';
import { create } from 'zustand';

// 토스트 타입
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  multiline?: boolean; // 다중 라인 지원
}

// 토스트 스토어
interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    
    set(state => ({
      toasts: [...state.toasts, newToast]
    }));
    
    // 자동 제거
    setTimeout(() => {
      get().removeToast(id);
    }, toast.duration || 3000);
  },
  
  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  }
}));

// 토스트 컴포넌트
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast,
  onRemove
}) => {
  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'theme-toast-success';
      case 'error':
        return 'theme-toast-error';
      case 'warning':
        return 'theme-toast-warning';
      case 'info':
      default:
        return 'theme-toast-info';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-lg ${getToastStyles()} toast-enter`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-2">
          <span className="flex-shrink-0">{getIcon()}</span>
          <span className={`text-sm font-medium ${toast.multiline ? 'whitespace-pre-line' : ''}`}>
            {toast.message}
          </span>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="ml-3 text-current hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// 토스트 컨테이너
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
};

// 토스트 헬퍼 함수들
export const toast = {
  success: (message: string, options?: { duration?: number; multiline?: boolean }) => {
    useToastStore.getState().addToast({ 
      type: 'success', 
      message, 
      duration: options?.duration,
      multiline: options?.multiline 
    });
  },
  
  error: (message: string, options?: { duration?: number; multiline?: boolean }) => {
    useToastStore.getState().addToast({ 
      type: 'error', 
      message, 
      duration: options?.duration,
      multiline: options?.multiline 
    });
  },
  
  warning: (message: string, options?: { duration?: number; multiline?: boolean }) => {
    useToastStore.getState().addToast({ 
      type: 'warning', 
      message, 
      duration: options?.duration,
      multiline: options?.multiline 
    });
  },
  
  info: (message: string, options?: { duration?: number; multiline?: boolean }) => {
    useToastStore.getState().addToast({ 
      type: 'info', 
      message, 
      duration: options?.duration,
      multiline: options?.multiline 
    });
  }
};
