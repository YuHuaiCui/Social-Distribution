import React, { useState, useEffect } from 'react';
import AuthLoadingScreen from './AuthLoadingScreen';

interface MinLoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
}

/**
 * Wrapper that ensures loading screen shows for minimum 1 second
 * and handles fade transitions
 */
export const MinLoadingWrapper: React.FC<MinLoadingWrapperProps> = ({
  isLoading,
  children,
  message
}) => {
  const [showLoading, setShowLoading] = useState(isLoading);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShowLoading(true);
      setMinTimeElapsed(false);
      setFadeOut(false);
    } else if (minTimeElapsed && showLoading) {
      // Start fade out
      setFadeOut(true);
      // Remove loading screen after fade animation
      setTimeout(() => {
        setShowLoading(false);
      }, 300);
    }
  }, [isLoading, minTimeElapsed, showLoading]);

  if (showLoading) {
    return (
      <div className={`transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
        <AuthLoadingScreen 
          message={message} 
          onMinTimeElapsed={() => {
            setMinTimeElapsed(true);
            if (!isLoading) {
              // If loading already finished, start fade out
              setFadeOut(true);
              setTimeout(() => {
                setShowLoading(false);
              }, 300);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn flex flex-col flex-1 min-h-0">
      {children}
    </div>
  );
};

export default MinLoadingWrapper;