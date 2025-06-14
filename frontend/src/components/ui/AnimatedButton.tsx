import React from 'react';
import { motion } from 'framer-motion';
import type { MotionProps } from 'framer-motion';
import { Loader } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AnimatedButtonProps extends Omit<MotionProps & React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  gradientColors?: string[];
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
  ...props
}) => {
  // Dynamic gradient based on variant
  const getGradientStyle = () => {
    if (gradientColors && gradientColors.length > 0) {
      return {
        background: `linear-gradient(135deg, ${gradientColors.join(', ')})`,
        backgroundSize: '400% 400%',
      };
    }
    
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, var(--primary-yellow) 0%, var(--primary-pink) 20%, var(--primary-purple) 40%, var(--primary-violet) 60%, var(--primary-teal) 80%, var(--primary-yellow) 100%)',
          backgroundSize: '600% 600%',
        };
      case 'secondary':
        return {
          background: 'linear-gradient(135deg, var(--primary-pink) 0%, var(--primary-purple) 33%, var(--primary-teal) 66%, var(--primary-pink) 100%)',
          backgroundSize: '400% 400%',
        };
      case 'gradient':
        return {
          background: 'linear-gradient(135deg, var(--vibrant-yellow) 0%, var(--vibrant-pink) 16%, var(--vibrant-purple) 33%, var(--vibrant-teal) 50%, var(--vibrant-coral) 66%, var(--vibrant-blue) 83%, var(--vibrant-yellow) 100%)',
          backgroundSize: '700% 700%',
        };
      default:
        return {};
    }
  };

  const gradientStyle = getGradientStyle();
  const isGradient = variant === 'primary' || variant === 'secondary' || variant === 'gradient';

  return (
    <motion.button
      style={isGradient ? gradientStyle : undefined}
      className={`
        relative overflow-hidden
        inline-flex items-center justify-center
        font-medium rounded-lg
        transition-all duration-200
        ${isGradient ? 'text-white' : ''}
        ${variant === 'ghost' ? 'bg-transparent text-text-2 hover:text-text-1' : ''}
        ${variant === 'danger' ? 'bg-red-500 text-white' : ''}
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
              filter: isGradient ? 'brightness(1.15) saturate(1.2)' : undefined,
              boxShadow: isGradient 
                ? '0 10px 30px rgba(124, 77, 255, 0.4), 0 5px 15px rgba(255, 107, 157, 0.3)' 
                : undefined,
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
      animate={
        isGradient
          ? {
              backgroundPosition: ['0% 50%', '50% 100%', '100% 50%', '50% 0%', '0% 50%'],
            }
          : {}
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
        backgroundPosition: isGradient ? {
          duration: 3,
          ease: 'easeInOut',
          repeat: Infinity,
        } : undefined,
      }}
      disabled={disabled || loading}
      {...props}
    >
      {/* Shimmer overlay for gradient buttons */}
      {isGradient && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
            ease: 'linear',
          }}
          style={{
            background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
            opacity: 0.5,
          }}
        />
      )}
      
      {/* Button content */}
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