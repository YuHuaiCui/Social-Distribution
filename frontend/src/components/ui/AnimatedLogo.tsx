import React from 'react';
import { motion } from 'framer-motion';

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
  const gradientVariants = {
    primary: {
      background: [
        'linear-gradient(135deg, var(--primary-pink) 0%, var(--primary-purple) 50%, var(--primary-violet) 100%)',
        'linear-gradient(135deg, var(--primary-purple) 0%, var(--primary-violet) 50%, var(--primary-blue) 100%)',
        'linear-gradient(135deg, var(--primary-violet) 0%, var(--primary-blue) 50%, var(--primary-pink) 100%)',
        'linear-gradient(135deg, var(--primary-pink) 0%, var(--primary-purple) 50%, var(--primary-violet) 100%)',
      ],
    },
    secondary: {
      background: [
        'linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-blue) 50%, var(--primary-purple) 100%)',
        'linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-purple) 50%, var(--primary-teal) 100%)',
        'linear-gradient(135deg, var(--primary-purple) 0%, var(--primary-teal) 50%, var(--primary-blue) 100%)',
        'linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-blue) 50%, var(--primary-purple) 100%)',
      ],
    },
    rainbow: {
      background: [
        'linear-gradient(135deg, #FF6B9D 0%, #C06FF7 20%, #7C4DFF 40%, #3498DB 60%, #4ECDC4 80%, #FFE66D 100%)',
        'linear-gradient(135deg, #C06FF7 0%, #7C4DFF 20%, #3498DB 40%, #4ECDC4 60%, #FFE66D 80%, #FF6B9D 100%)',
        'linear-gradient(135deg, #7C4DFF 0%, #3498DB 20%, #4ECDC4 40%, #FFE66D 60%, #FF6B9D 80%, #C06FF7 100%)',
        'linear-gradient(135deg, #FF6B9D 0%, #C06FF7 20%, #7C4DFF 40%, #3498DB 60%, #4ECDC4 80%, #FFE66D 100%)',
      ],
    },
  };

  return (
    <div className={`relative inline-flex ${sizeStyles[size]}`}>
      {/* Background gradient layers for smooth transitions */}
      {gradientVariants[variant].background.map((gradient, index) => (
        <motion.div
          key={index}
          className="absolute inset-0 rounded-2xl"
          style={{ background: gradient }}
          initial={{ opacity: index === 0 ? 1 : 0 }}
          animate={{
            opacity: index === 0 ? [1, 0, 0, 0, 1] :
                    index === 1 ? [0, 1, 0, 0, 0] :
                    index === 2 ? [0, 0, 1, 0, 0] :
                    [0, 0, 0, 1, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        />
      ))}
      
      {/* Main container */}
      <motion.div
        className="relative inline-flex items-center justify-center rounded-2xl shadow-lg w-full h-full overflow-hidden"
        whileHover={{
          scale: 1.05,
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
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.8) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 0%, transparent 50%)',
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.span
          className="relative text-white font-bold z-10"
          animate={{
            textShadow: [
              '0 0 10px rgba(255,255,255,0.3)',
              '0 0 20px rgba(255,255,255,0.5)',
              '0 0 10px rgba(255,255,255,0.3)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          {children}
        </motion.span>
      </motion.div>
    </div>
  );
};

export default AnimatedLogo;