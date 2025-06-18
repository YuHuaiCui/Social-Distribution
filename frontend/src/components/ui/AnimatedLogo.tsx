import React from 'react';
import { motion } from 'framer-motion';
import AnimatedGradient from './AnimatedGradient';

interface AnimatedLogoProps {
  variant?: 'primary' | 'secondary' | 'rainbow';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

const sizeStyles = {
  sm: 'w-16 h-16 text-2xl',
  md: 'w-20 h-20 text-3xl',
  lg: 'w-24 h-24 text-4xl',
};

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ 
  variant = 'primary', 
  size = 'md',
  children = 'S'
}) => {
  const gradientColors = {
    primary: ['var(--primary-purple)', 'var(--primary-pink)', 'var(--primary-teal)', 'var(--primary-violet)', 'var(--primary-yellow)', 'var(--primary-blue)'],
    secondary: ['var(--primary-teal)', 'var(--primary-blue)', 'var(--primary-purple)', 'var(--primary-coral)'],
    rainbow: ['var(--primary-purple)', 'var(--primary-pink)', 'var(--primary-teal)', 'var(--primary-violet)', 'var(--primary-yellow)', 'var(--primary-blue)', 'var(--primary-coral)'],
  };

  return (
    <motion.div
      className={`relative inline-flex ${sizeStyles[size]}`}
      whileHover={{
        scale: 1.1,
        rotate: [0, -5, 5, -5, 0],
        transition: {
          rotate: {
            duration: 0.5,
            ease: "easeInOut",
          },
          scale: {
            duration: 0.2,
          },
        },
      }}
    >
      <AnimatedGradient
        gradientColors={gradientColors[variant]}
        className="w-full h-full rounded-2xl flex items-center justify-center shadow-xl"
        textClassName="text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
        duration={variant === 'rainbow' ? 10 : 15}
      >
        <motion.span
          animate={{
            textShadow: [
              '0 0 10px rgba(255,255,255,0.3)',
              '0 0 20px rgba(255,255,255,0.5)',
              '0 0 10px rgba(255,255,255,0.3)',
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          {children}
        </motion.span>
      </AnimatedGradient>
    </motion.div>
  );
};

export default AnimatedLogo;