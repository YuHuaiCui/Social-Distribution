import React from 'react';
import { toast, Toaster } from 'sonner';

interface ToastContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showSuccess = (message: string) => {
    toast.success(message, {
      duration: 3000,
      className: 'sonner-toast-success',
    });
  };

  const showError = (message: string) => {
    toast.error(message, {
      duration: 5000,
      className: 'sonner-toast-error',
    });
  };

  const showInfo = (message: string) => {
    toast.info(message, {
      duration: 4000,
      className: 'sonner-toast-info',
    });
  };

  const showWarning = (message: string) => {
    toast.warning(message, {
      duration: 4000,
      className: 'sonner-toast-warning',
    });
  };

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showWarning }}>
      <Toaster 
        theme="system"
        position="top-right"
        richColors
        expand={true}
        closeButton
        toastOptions={{
          classNames: {
            toast: 'sonner-toast',
            title: 'sonner-title',
            description: 'sonner-description',
            closeButton: 'sonner-close',
          },
        }}
      />
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