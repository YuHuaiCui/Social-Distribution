import React from 'react';
import { motion } from 'framer-motion';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const sizes = {
    sm: { track: 'w-10 h-5', thumb: 'w-3.5 h-3.5', translate: 22 },
    md: { track: 'w-12 h-6', thumb: 'w-4 h-4', translate: 24 },
    lg: { track: 'w-14 h-7', thumb: 'w-5 h-5', translate: 28 },
  };

  const sizeConfig = sizes[size];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div 
      className={`relative inline-flex items-center ${className}`}
      onClick={handleClick}
    >
      <motion.div
        className={`
          ${sizeConfig.track} 
          rounded-full 
          transition-all duration-300
          cursor-pointer
          ${checked 
            ? 'bg-gradient-to-r from-[var(--primary-purple)] via-[var(--primary-pink)] to-[var(--primary-violet)]' 
            : 'bg-[rgba(var(--glass-rgb),0.3)] backdrop-blur-sm border-2 border-[var(--border-1)]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          shadow-inner
          relative
          flex items-center
        `}
        whileTap={!disabled ? { scale: 0.95 } : {}}
      >
        <motion.div
          initial={false}
          animate={{
            x: checked ? sizeConfig.translate : 2
          }}
          transition={{ 
            type: 'spring', 
            stiffness: 500, 
            damping: 30 
          }}
          className={`
            ${sizeConfig.thumb} 
            rounded-full 
            bg-white 
            shadow-md
            ${checked ? 'shadow-lg' : 'shadow-sm'}
          `}
          style={{
            marginLeft: '2px',
            marginRight: '2px'
          }}
        />
      </motion.div>
    </div>
  );
};

export default Toggle;