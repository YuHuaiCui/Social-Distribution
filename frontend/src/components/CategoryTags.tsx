import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hash, X, Plus, TrendingUp, Search
} from 'lucide-react';
import { FloatingDropdown } from './ui/FloatingDropdown';

interface CategoryTagsProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const defaultSuggestions = [
  'technology', 'programming', 'web-development', 'react', 'typescript',
  'javascript', 'python', 'ai', 'machine-learning', 'design',
  'tutorial', 'tips', 'news', 'discussion', 'help',
];

const tagColors = [
  'var(--primary-blue)',
  'var(--primary-purple)',
  'var(--primary-teal)',
  'var(--primary-pink)',
  'var(--primary-coral)',
  'var(--primary-violet)',
];

const getTagColor = (tag: string): string => {
  // Generate a consistent color for each tag based on its hash
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % tagColors.length;
  return tagColors[index];
};

export const CategoryTags: React.FC<CategoryTagsProps> = ({
  value,
  onChange,
  maxTags = 5,
  suggestions = defaultSuggestions,
  placeholder = 'Add tags...',
  disabled = false,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Filter suggestions based on input
    if (inputValue) {
      const filtered = suggestions
        .filter(tag => 
          tag.toLowerCase().includes(inputValue.toLowerCase()) &&
          !value.includes(tag)
        )
        .slice(0, 8);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      // Show trending tags when input is empty
      const trending = suggestions
        .filter(tag => !value.includes(tag))
        .slice(0, 8);
      setFilteredSuggestions(trending);
    }
  }, [inputValue, value, suggestions]);

  // Removed click outside handler as FloatingDropdown handles it

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    if (normalizedTag && !value.includes(normalizedTag) && value.length < maxTags) {
      onChange([...value, normalizedTag]);
      setInputValue('');
      setSelectedIndex(-1);
      inputRef.current?.focus();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          handleAddTag(filteredSuggestions[selectedIndex]);
        } else if (inputValue) {
          handleAddTag(inputValue);
        }
        break;
        
      case 'Backspace':
        if (!inputValue && value.length > 0) {
          handleRemoveTag(value[value.length - 1]);
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const getTagColor = (tag: string) => {
    const index = tag.charCodeAt(0) % tagColors.length;
    return tagColors[index];
  };

  const remainingTags = maxTags - value.length;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Tag Input Container */}
      <div 
        ref={triggerRef}
        className={`
          min-h-[48px] px-4 py-2 bg-input-bg border border-border-1 rounded-lg
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--primary-violet)]'}
          ${showSuggestions ? 'ring-2 ring-[var(--primary-violet)] border-transparent' : ''}
        `}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Selected Tags */}
          <AnimatePresence>
            {value.map((tag, index) => (
              <motion.div
                key={tag}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-sm text-white transition-all"
                  style={{ backgroundColor: getTagColor(tag) }}
                >
                  <Hash size={12} />
                  <span>{tag}</span>
                  {!disabled && (
                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTag(tag);
                      }}
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </motion.button>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Input Field */}
          {value.length < maxTags && !disabled && (
            <div className="flex-1 min-w-[120px]">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder={value.length === 0 ? placeholder : `Add ${remainingTags} more...`}
                disabled={disabled}
                className="w-full bg-transparent text-text-1 placeholder:text-text-2 focus:outline-none"
              />
            </div>
          )}
          
          {/* Tag Count */}
          <div className="ml-auto text-xs text-text-2">
            {value.length}/{maxTags}
          </div>
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-text-2 mt-1 ml-1">
        Press Enter to add tags. Use hyphens for multi-word tags.
      </p>

      {/* Suggestions Dropdown */}
      <FloatingDropdown
        isOpen={showSuggestions && filteredSuggestions.length > 0}
        onClose={() => setShowSuggestions(false)}
        triggerRef={triggerRef}
        className="glass-card-prominent rounded-lg shadow-xl overflow-hidden"
      >
            {/* Header */}
            <div className="flex items-center space-x-2 px-4 py-2 border-b border-border-1">
              {inputValue ? (
                <>
                  <Search size={14} className="text-text-2" />
                  <span className="text-xs text-text-2">Suggestions</span>
                </>
              ) : (
                <>
                  <TrendingUp size={14} className="text-text-2" />
                  <span className="text-xs text-text-2">Popular Tags</span>
                </>
              )}
            </div>
            
            {/* Suggestion List */}
            <div className="max-h-48 overflow-y-auto py-2">
              {filteredSuggestions.map((suggestion, index) => {
                const isSelected = index === selectedIndex;
                
                return (
                  <motion.button
                    key={suggestion}
                    whileHover={{ x: 4 }}
                    onClick={() => handleAddTag(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`
                      w-full flex items-center justify-between px-4 py-2
                      transition-all hover:bg-glass-low
                      ${isSelected ? 'bg-glass-low' : ''}
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getTagColor(suggestion) }}
                      />
                      <span className="text-sm text-text-1">#{suggestion}</span>
                    </div>
                    {isSelected && (
                      <span className="text-xs text-text-2">Press Enter</span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Add Custom Tag */}
            {inputValue && !suggestions.includes(inputValue.toLowerCase()) && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ backgroundColor: 'var(--glass-low)' }}
                onClick={() => handleAddTag(inputValue)}
                className="w-full flex items-center space-x-2 px-4 py-3 border-t border-border-1 transition-colors"
              >
                <Plus size={16} className="text-[var(--primary-violet)]" />
                <span className="text-sm text-text-1">
                  Create tag "<span className="font-medium">#{inputValue.toLowerCase()}</span>"
                </span>
              </motion.button>
            )}
      </FloatingDropdown>
    </div>
  );
};

// Tag Cloud Component for displaying popular tags
interface TagCloudProps {
  tags: { name: string; count: number }[];
  onTagClick?: (tag: string) => void;
  maxTags?: number;
  className?: string;
}

export const TagCloud: React.FC<TagCloudProps> = ({
  tags,
  onTagClick,
  maxTags = 20,
  className = '',
}) => {
  const sortedTags = [...tags]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxTags);

  const maxCount = Math.max(...tags.map(t => t.count));
  const minCount = Math.min(...tags.map(t => t.count));

  const getTagSize = (count: number) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    const size = 0.75 + normalized * 0.75; // 0.75rem to 1.5rem
    return `${size}rem`;
  };

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {sortedTags.map((tag, index) => (
        <motion.button
          key={tag.name}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.02 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onTagClick?.(tag.name)}
          className="group relative"
          style={{ fontSize: getTagSize(tag.count) }}
        >
          <span
            className="font-medium transition-colors hover:opacity-80"
            style={{ color: getTagColor(tag.name) }}
          >
            #{tag.name}
          </span>
          
          {/* Count tooltip */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded pointer-events-none"
          >
            {tag.count} posts
          </motion.div>
        </motion.button>
      ))}
    </div>
  );
};

// Single Tag Display Component
interface TagBadgeProps {
  tag: string;
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = 'md',
  removable = false,
  onRemove,
  onClick,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        inline-flex items-center space-x-1 rounded-full text-white
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{ backgroundColor: getTagColor(tag) }}
    >
      <Hash size={iconSizes[size]} />
      <span>{tag}</span>
      {removable && onRemove && (
        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1"
        >
          <X size={iconSizes[size]} />
        </motion.button>
      )}
    </motion.div>
  );
};

export default CategoryTags;