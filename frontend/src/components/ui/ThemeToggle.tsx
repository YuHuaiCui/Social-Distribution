import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const { theme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        relative rounded-full 
        bg-[rgba(var(--glass-rgb),var(--glass-alpha))] 
        backdrop-blur-xl
        border border-[var(--border-1)]
        hover:border-[var(--primary-violet)]
        transition-all duration-300
        flex items-center justify-center
        group
        cursor-pointer
        ${className}
      `}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Sun icon */}
        <Sun 
          size={iconSize[size]}
          className={`
            absolute transition-all duration-300
            ${theme === 'light' 
              ? 'opacity-100 rotate-0 scale-100 text-[var(--primary-yellow)]' 
              : 'opacity-0 -rotate-90 scale-50 text-[var(--text-2)]'}
          `}
        />
        
        {/* Moon icon */}
        <Moon 
          size={iconSize[size]}
          className={`
            absolute transition-all duration-300
            ${theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100 text-[var(--primary-purple)]' 
              : 'opacity-0 rotate-90 scale-50 text-[var(--text-2)]'}
          `}
        />
      </div>
      
      {/* Hover effect */}
      <div className="absolute inset-0 rounded-full bg-[var(--primary-violet)] opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
    </button>
  );
};

export default ThemeToggle;