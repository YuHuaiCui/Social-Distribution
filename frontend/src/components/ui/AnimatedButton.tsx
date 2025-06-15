import React from 'react';
import { motion } from 'framer-motion';
import type { MotionProps } from 'framer-motion';
import { Loader } from 'lucide-react';
import AnimatedGradient from './AnimatedGradient';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AnimatedButtonProps extends Omit<MotionProps & React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  gradientColors?: string[];
  animationDuration?: number;
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  gradientColors,
  animationDuration = 20,
  ...props
}) => {
  // Determine gradient colors based on variant
  const getGradientColors = () => {
    if (gradientColors && gradientColors.length > 0) {
      return gradientColors;
    }
    
    switch (variant) {
      case 'primary':
        return ['var(--primary-purple)', 'var(--primary-pink)', 'var(--primary-teal)', 'var(--primary-violet)', 'var(--primary-yellow)', 'var(--primary-blue)'];
      case 'secondary':
        return ['var(--primary-teal)', 'var(--primary-blue)', 'var(--primary-purple)'];
      case 'gradient':
        return ['var(--primary-purple)', 'var(--primary-pink)', 'var(--primary-teal)', 'var(--primary-violet)', 'var(--primary-blue)', 'var(--primary-coral)', 'var(--primary-yellow)'];
      default:
        return [];
    }
  };

  const colors = getGradientColors();
  const isGradient = variant === 'primary' || variant === 'secondary' || variant === 'gradient';

  // For gradient buttons, use AnimatedGradient
  if (isGradient && colors.length > 0) {
    return (
      <AnimatedGradient
        as="button"
        gradientColors={colors}
        className={`
          inline-flex items-center justify-center
          font-medium rounded-lg shadow-lg
          ${sizeStyles[size]}
          ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        textClassName="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center"
        duration={animationDuration}
        onClick={disabled || loading ? undefined : props.onClick}
        type={props.type || 'submit'}
        disabled={disabled || loading}
      >
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mr-2"
          >
            <Loader className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </motion.div>
        ) : icon ? (
          <span className="mr-2">{icon}</span>
        ) : null}
        {children}
      </AnimatedGradient>
    );
  }

  // For non-gradient buttons, use regular motion.button
  return (
    <motion.button
      className={`
        relative overflow-hidden
        inline-flex items-center justify-center
        font-medium rounded-lg
        transition-all duration-200
        ${variant === 'ghost' ? 'bg-transparent text-text-2 hover:text-text-1 hover:bg-[rgba(var(--glass-rgb),0.3)]' : ''}
        ${variant === 'danger' ? 'bg-red-500/80 text-white hover:bg-red-500' : ''}
        ${sizeStyles[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      whileHover={
        disabled || loading
          ? {}
          : {
              scale: 1.05,
              y: -2,
            }
      }
      whileTap={
        disabled || loading
          ? {}
          : {
              scale: 0.97,
              y: 0,
            }
      }
      transition={{
        scale: {
          type: 'spring',
          stiffness: 400,
          damping: 20,
        },
        y: {
          type: 'spring',
          stiffness: 400,
          damping: 20,
        },
      }}
      disabled={disabled || loading}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center">
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mr-2"
          >
            <Loader className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </motion.div>
        ) : icon ? (
          <span className="mr-2">{icon}</span>
        ) : null}
        {children}
      </span>
    </motion.button>
  );
};

export default AnimatedButton;