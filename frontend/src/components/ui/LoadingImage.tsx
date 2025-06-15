import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader, ImageOff } from 'lucide-react';

interface LoadingImageProps {
  src: string;
  alt: string;
  className?: string;
  loaderSize?: number;
  aspectRatio?: string;
  fallback?: React.ReactNode;
}

export const LoadingImage: React.FC<LoadingImageProps> = ({
  src,
  alt,
  className = '',
  loaderSize = 24,
  aspectRatio,
  fallback,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
    };
    
    img.onerror = () => {
      setError(true);
      setLoading(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  const containerStyle = aspectRatio 
    ? { aspectRatio, width: '100%' }
    : {};

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={containerStyle}
    >
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-glass-low"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              <Loader size={loaderSize} className="text-brand-500" />
            </motion.div>
          </motion.div>
        )}

        {!loading && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-glass-low"
          >
            {fallback || (
              <div className="text-center">
                <ImageOff size={loaderSize} className="text-text-2 mx-auto mb-2" />
                <p className="text-sm text-text-2">Failed to load image</p>
              </div>
            )}
          </motion.div>
        )}

        {!loading && !error && imageSrc && (
          <motion.img
            key="image"
            src={imageSrc}
            alt={alt}
            className={`w-full h-full object-cover ${className}`}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoadingImage;