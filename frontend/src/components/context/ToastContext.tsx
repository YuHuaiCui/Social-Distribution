import React from 'react';
import toast, { Toaster, ToastOptions } from 'react-hot-toast';

interface ToastContextType {
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showSuccess = (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: 'var(--card-bg)',
        color: 'var(--text-primary)',
        border: '1px solid var(--primary-purple)',
      },
      iconTheme: {
        primary: 'var(--primary-purple)',
        secondary: '#fff',
      },
      ...options,
    });
  };

  const showError = (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: 'var(--card-bg)',
        color: 'var(--text-primary)',
        border: '1px solid var(--primary-pink)',
      },
      iconTheme: {
        primary: 'var(--primary-pink)',
        secondary: '#fff',
      },
      ...options,
    });
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: 'var(--card-bg)',
        color: 'var(--text-primary)',
        border: '1px solid var(--primary-teal)',
      },
      icon: '💡',
      ...options,
    });
  };

  const showWarning = (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: 'var(--card-bg)',
        color: 'var(--text-primary)',
        border: '1px solid var(--primary-yellow)',
      },
      icon: '⚠️',
      ...options,
    });
  };

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showWarning }}>
      <Toaster />
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};