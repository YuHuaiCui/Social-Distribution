import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
  id,
}) => {
  const sizes = {
    sm: { box: 'w-4 h-4', check: 12 },
    md: { box: 'w-5 h-5', check: 16 },
    lg: { box: 'w-6 h-6', check: 20 },
  };

  const sizeConfig = sizes[size];

  const checkmarkVariants = {
    hidden: { 
      pathLength: 0, 
      opacity: 0 
    },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: {
        pathLength: { 
          type: "spring", 
          duration: 0.5, 
          bounce: 0 
        },
        opacity: { duration: 0.1 }
      }
    }
  };

  return (
    <label 
      htmlFor={id}
      className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <input
        type="checkbox"
        id={id}
        className="sr-only"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
      />
      <motion.div
        className={`
          ${sizeConfig.box} 
          rounded-md
          transition-all duration-200
          ${checked 
            ? 'bg-gradient-to-br from-[var(--primary-purple)] to-[var(--primary-violet)] border-transparent' 
            : 'bg-[rgba(var(--glass-rgb),0.3)] backdrop-blur-sm border-2 border-[var(--border-1)]'
          }
          shadow-sm hover:shadow-md
        `}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
      >
        <AnimatePresence>
          {checked && (
            <motion.svg
              className="absolute inset-0 w-full h-full p-0.5"
              viewBox="0 0 24 24"
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <motion.path
                d="M5 13l4 4L19 7"
                stroke="white"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={checkmarkVariants}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>
    </label>
  );
};

export default Checkbox;