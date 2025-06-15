import React from 'react';
import { motion } from 'framer-motion';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export const Loader: React.FC<LoaderProps> = ({ size = 'md', message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <motion.div
        className={`relative ${sizeClasses[size]}`}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <div className={`absolute inset-0 rounded-full border-4 border-glass-border ${sizeClasses[size]}`} />
        <div className={`absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent ${sizeClasses[size]}`} />
      </motion.div>
      {message && (
        <p className="mt-4 text-text-2 text-sm">{message}</p>
      )}
    </div>
  );
};

export default Loader;