import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Users,
  Link,
  Lock,
  ChevronDown,
  Check,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import { FloatingDropdown } from "./ui/FloatingDropdown";
import type { Visibility } from "../types/common";

interface PrivacyOption {
  value: Visibility;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  description: string;
  color: string;
}

interface PrivacySelectorProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
  showDescription?: boolean;
  disabled?: boolean;
  className?: string;
}

const privacyOptions: PrivacyOption[] = [
  {
    value: "PUBLIC",
    label: "Public",
    icon: Globe,
    description: "Anyone can see this post",
    color: "text-green-500",
  },
  {
    value: "FRIENDS",
    label: "Friends Only",
    icon: Users,
    description: "Only your friends can see this post",
    color: "text-blue-500",
  },
  {
    value: "UNLISTED",
    label: "Unlisted",
    icon: Link,
    description: "Visible to followers and friends, not shown in public feeds",
    color: "text-yellow-500",
  },
];

export const PrivacySelector: React.FC<PrivacySelectorProps> = ({
  value,
  onChange,
  showDescription = true,
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption =
    privacyOptions.find((opt) => opt.value === value) || privacyOptions[0];
  const Icon = selectedOption.icon;

  const handleOptionSelect = (e: React.MouseEvent, optionValue: Visibility) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      className={`relative ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Selected Option Button */}
      <motion.button
        ref={triggerRef}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-3
          bg-input-bg border border-border-1 rounded-lg
          transition-all duration-200
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-[var(--primary-violet)] cursor-pointer"
          }
          ${
            isOpen
              ? "ring-2 ring-[var(--primary-violet)] border-transparent"
              : ""
          }
        `}
      >
        <div className="flex items-center space-x-3">
          <Icon size={18} className={selectedOption.color} />
          <span className="text-text-1 font-medium">
            {selectedOption.label}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} className="text-text-2" />
        </motion.div>
      </motion.button>

      {/* Description */}
      {showDescription && !isOpen && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-text-2 mt-1 ml-1"
        >
          {selectedOption.description}
        </motion.p>
      )}

      {/* Dropdown */}
      <FloatingDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef as React.RefObject<HTMLElement>}
        className="glass-card-prominent rounded-lg shadow-xl max-h-[300px] overflow-y-auto"
      >
        {/* Info Header */}
        <div className="flex items-center justify-between p-3 border-b border-border-1">
          <span className="text-sm font-medium text-text-2">
            Post Visibility
          </span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowInfo(!showInfo);
            }}
            className="p-1 rounded hover:bg-glass-low transition-colors"
          >
            <Info size={16} className="text-text-2" />
          </motion.button>
        </div>

        {/* Info Panel */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-[var(--primary-violet)]/10 border-b border-border-1">
                <p className="text-sm text-text-1 mb-2">
                  Choose who can see your post:
                </p>
                <ul className="space-y-1 text-xs text-text-2">
                  <li className="flex items-start space-x-2">
                    <Eye size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Public:</strong> Visible to everyone on the
                      internet
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Users size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Friends:</strong> Only your approved friends can
                      view
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Link size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Unlisted:</strong> Visible to followers and
                      friends, not shown in public feeds
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Lock size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Private:</strong> Draft mode, only you can see it
                    </span>
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        <div className="py-2">
          {privacyOptions.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = value === option.value;

            return (
              <motion.button
                key={option.value}
                whileHover={{ x: 4 }}
                onClick={(e) => handleOptionSelect(e, option.value)}
                className={`
                        w-full flex items-center justify-between px-4 py-3
                        transition-all hover:bg-glass-low
                        ${isSelected ? "bg-[var(--primary-violet)]/10" : ""}
                      `}
              >
                <div className="flex items-center space-x-3">
                  <OptionIcon size={20} className={option.color} />
                  <div className="text-left">
                    <p className="font-medium text-text-1">{option.label}</p>
                    <p className="text-xs text-text-2">{option.description}</p>
                  </div>
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 25,
                    }}
                  >
                    <Check size={18} className="text-[var(--primary-violet)]" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </FloatingDropdown>
    </div>
  );
};

// Compact variant for inline use
interface PrivacyBadgeProps {
  value: Visibility;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({
  value,
  size = "md",
  showLabel = true,
  className = "",
}) => {
  const option =
    privacyOptions.find((opt) => opt.value === value) || privacyOptions[0];
  const Icon = option.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`
        inline-flex items-center space-x-1.5 rounded-full
        glass-card-subtle
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <Icon size={iconSizes[size]} className={option.color} />
      {showLabel && (
        <span className="text-text-1 font-medium">{option.label}</span>
      )}
    </motion.div>
  );
};

// Quick toggle for switching between public/private
interface PrivacyToggleProps {
  isPublic: boolean;
  onChange: (isPublic: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  isPublic,
  onChange,
  disabled = false,
  className = "",
}) => {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={() => !disabled && onChange(!isPublic)}
      disabled={disabled}
      className={`
        relative inline-flex items-center space-x-2 px-4 py-2 rounded-lg
        transition-all duration-200
        ${
          isPublic
            ? "bg-green-500/20 text-green-500"
            : "bg-glass-low text-text-2"
        }
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-opacity-30 cursor-pointer"
        }
        ${className}
      `}
    >
      <AnimatePresence mode="wait">
        {isPublic ? (
          <motion.div
            key="public"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="flex items-center space-x-2"
          >
            <Eye size={18} />
            <span className="font-medium">Public</span>
          </motion.div>
        ) : (
          <motion.div
            key="private"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="flex items-center space-x-2"
          >
            <EyeOff size={18} />
            <span className="font-medium">Private</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default PrivacySelector;
