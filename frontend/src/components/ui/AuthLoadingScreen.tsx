import React, { useState, useEffect } from 'react';
import BackgroundEffects from './BackgroundEffects';

interface AuthLoadingScreenProps {
  message?: string;
  onMinTimeElapsed?: () => void;
}

/**
 * Full-screen loading component shown during authentication checks
 * Prevents any flash of protected content before auth verification
 * Shows for minimum 1 second to avoid flickering
 */
export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({ 
  message = "Checking authentication...",
  onMinTimeElapsed
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldFadeOut, setShouldFadeOut] = useState(false);

  useEffect(() => {
    // Ensure minimum display time of 1 second
    const timer = setTimeout(() => {
      if (onMinTimeElapsed) {
        onMinTimeElapsed();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [onMinTimeElapsed]);

  return (
    <div 
      className={`min-h-screen bg-[var(--bg-color)] relative flex items-center justify-center transition-opacity duration-300 ${
        shouldFadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <BackgroundEffects />
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-[var(--glass-border-subtle)] animate-ping"></div>
          {/* Inner spinner */}
          <div className="relative w-12 h-12 rounded-full border-2 border-[var(--glass-border-subtle)] border-t-[var(--primary-violet)] animate-spin"></div>
        </div>
        <p className="mt-6 text-[var(--text-secondary)] text-sm animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

export default AuthLoadingScreen;