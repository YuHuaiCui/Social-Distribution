import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationBadgeProps {
  count: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  max = 99,
  size = 'md',
  pulse = true,
  color = 'primary',
  className = '',
}) => {
  const displayCount = count > max ? `${max}+` : count.toString();
  
  const sizeClasses = {
    sm: 'min-w-[18px] h-[18px] text-[10px] px-1',
    md: 'min-w-[22px] h-[22px] text-xs px-1.5',
    lg: 'min-w-[26px] h-[26px] text-sm px-2',
  };

  const colorClasses = {
    primary: 'bg-[var(--primary-violet)]',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  const colorPulseClasses = {
    primary: 'bg-[var(--primary-violet)]',
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    danger: 'bg-red-400',
  };

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 500,
            damping: 25,
          }}
          className={`
            relative inline-flex items-center justify-center
            rounded-full text-white font-semibold
            ${sizeClasses[size]}
            ${colorClasses[color]}
            ${className}
          `}
        >
          {/* Pulse effect */}
          {pulse && count > 0 && (
            <>
              <motion.span
                className={`absolute inset-0 rounded-full ${colorPulseClasses[color]} opacity-75`}
                animate={{
                  scale: [1, 1.5, 1.5],
                  opacity: [0.75, 0, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              />
              <motion.span
                className={`absolute inset-0 rounded-full ${colorPulseClasses[color]} opacity-75`}
                animate={{
                  scale: [1, 1.3, 1.3],
                  opacity: [0.5, 0, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                  delay: 0.2,
                }}
              />
            </>
          )}
          
          {/* Count */}
          <motion.span
            key={displayCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            {displayCount}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Dot variant for minimal notification indicator
interface NotificationDotProps {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const NotificationDot: React.FC<NotificationDotProps> = ({
  show,
  size = 'md',
  pulse = true,
  color = 'primary',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const colorClasses = {
    primary: 'bg-[var(--primary-violet)]',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 500,
            damping: 25,
          }}
          className={`
            relative rounded-full
            ${sizeClasses[size]}
            ${colorClasses[color]}
            ${className}
          `}
        >
          {pulse && (
            <motion.span
              className={`absolute inset-0 rounded-full ${colorClasses[color]}`}
              animate={{
                scale: [1, 2, 2],
                opacity: [0.5, 0, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Combined badge with icon
interface IconWithBadgeProps {
  icon: React.ReactNode;
  count: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  offset?: number;
  badgeProps?: Omit<NotificationBadgeProps, 'count'>;
}

export const IconWithBadge: React.FC<IconWithBadgeProps> = ({
  icon,
  count,
  position = 'top-right',
  offset = -4,
  badgeProps = {},
}) => {
  const positionClasses = {
    'top-right': `top-0 right-0 translate-x-1/2 -translate-y-1/2`,
    'top-left': `top-0 left-0 -translate-x-1/2 -translate-y-1/2`,
    'bottom-right': `bottom-0 right-0 translate-x-1/2 translate-y-1/2`,
    'bottom-left': `bottom-0 left-0 -translate-x-1/2 translate-y-1/2`,
  };

  return (
    <div className="relative inline-flex">
      {icon}
      <div 
        className={`absolute ${positionClasses[position]}`}
        style={{ 
          top: position.includes('top') ? offset : undefined,
          bottom: position.includes('bottom') ? offset : undefined,
          right: position.includes('right') ? offset : undefined,
          left: position.includes('left') ? offset : undefined,
        }}
      >
        <NotificationBadge count={count} {...badgeProps} />
      </div>
    </div>
  );
};

export default NotificationBadge;