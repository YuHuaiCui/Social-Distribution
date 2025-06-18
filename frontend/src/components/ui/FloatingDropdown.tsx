import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  className?: string;
  placement?: 'bottom' | 'top';
  offset?: number;
}

export const FloatingDropdown: React.FC<FloatingDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  children,
  className = '',
  placement = 'bottom',
  offset = 8,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (triggerRef.current && dropdownRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const dropdownRect = dropdownRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        let top = 0;
        
        if (placement === 'bottom') {
          top = triggerRect.bottom + offset;
          
          // Check if dropdown would go off screen
          if (top + dropdownRect.height > viewportHeight) {
            // Place above instead
            top = triggerRect.top - dropdownRect.height - offset;
          }
        } else {
          top = triggerRect.top - dropdownRect.height - offset;
          
          // Check if dropdown would go off top
          if (top < 0) {
            // Place below instead
            top = triggerRect.bottom + offset;
          }
        }
        
        setPosition({
          top,
          left: triggerRect.left,
          width: triggerRect.width,
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, triggerRef, placement, offset]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`fixed z-[9999] ${className}`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default FloatingDropdown;