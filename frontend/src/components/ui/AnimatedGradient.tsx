import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedGradientProps {
  children: React.ReactNode;
  className?: string;
  gradientColors: string[];
  duration?: number;
  textClassName?: string;
  onClick?: () => void;
  as?: 'div' | 'button';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export const AnimatedGradient: React.FC<AnimatedGradientProps> = ({
  children,
  className = '',
  gradientColors,
  duration = 20,
  textClassName = '',
  onClick,
  as = 'div',
  type = 'button',
  disabled = false,
}) => {
  // Create a smooth gradient that transitions between all colors
  const gradientStops = gradientColors.join(', ');
  
  const Component = as === 'button' ? motion.button : motion.div;

  return (
    <Component
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
      whileHover={disabled ? {} : { scale: 1.05, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      type={as === 'button' ? type : undefined}
      disabled={as === 'button' ? disabled : undefined}
    >
      {/* Smooth animated gradient background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${gradientStops})`,
          backgroundSize: '400% 400%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Content with contrast shadow */}
      <span className={`relative z-10 ${textClassName}`}>
        {children}
      </span>
    </Component>
  );
};

export default AnimatedGradient;