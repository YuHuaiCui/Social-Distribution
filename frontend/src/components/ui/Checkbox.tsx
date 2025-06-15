import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
  name?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
  id,
  name,
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
          type: "tween", 
          duration: 0.3, 
          ease: "easeOut"
        },
        opacity: { duration: 0.1 }
      }
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className={`
          ${sizeConfig.box}
          appearance-none
          rounded-md
          cursor-pointer
          transition-all duration-200
          bg-[rgba(var(--glass-rgb),0.3)]
          backdrop-blur-sm
          border-2
          border-[var(--border-1)]
          hover:border-[var(--primary-violet)]
          focus:outline-none
          focus:ring-2
          focus:ring-[var(--primary-violet)]
          focus:ring-opacity-50
          checked:bg-gradient-to-br
          checked:from-[var(--primary-purple)]
          checked:to-[var(--primary-violet)]
          checked:border-transparent
          disabled:opacity-50
          disabled:cursor-not-allowed
          shadow-sm
          hover:shadow-md
        `}
      />
      
      {/* Animated checkmark */}
      <AnimatePresence>
        {checked && (
          <motion.svg
            className={`absolute ${sizeConfig.box} pointer-events-none`}
            style={{
              left: '0',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
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
    </div>
  );
};

export default Checkbox;