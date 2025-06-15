import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type CardVariant = 'main' | 'prominent' | 'subtle';

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: CardVariant;
  hoverable?: boolean;
  children: React.ReactNode;
}

const variantStyles = {
  main: 'glass-card-main border border-[var(--border-1)]',
  prominent: 'glass-card-prominent border border-[var(--glass-border-prominent)] shadow-lg',
  subtle: 'glass-card-subtle border border-[var(--glass-border)]',
};

export const Card: React.FC<CardProps> = ({
  variant = 'main',
  hoverable = false,
  children,
  className = '',
  ...props
}) => {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState(false);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverable) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setMousePosition({ x, y });
  };
  
  const rotateX = hoverable && isHovered ? (mousePosition.y - 0.5) * -10 : 0;
  const rotateY = hoverable && isHovered ? (mousePosition.x - 0.5) * 10 : 0;
  
  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePosition({ x: 0.5, y: 0.5 });
      }}
      animate={{
        rotateX,
        rotateY,
        y: hoverable && isHovered ? -5 : 0,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      className={`
        rounded-xl p-5
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;