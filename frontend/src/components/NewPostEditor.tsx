import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Type, Code, Globe, Users, EyeOff, X } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import LoadingImage from './ui/LoadingImage';

interface NewPostEditorProps {
  onSubmit: (postData: {
    title: string;
    content: string;
    content_type: string;
    visibility: string;
    categories?: string[];
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const NewPostEditor: React.FC<NewPostEditorProps> = ({ 
  onSubmit, 
  onCancel,
  isLoading = false 
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<'text/plain' | 'text/markdown'>('text/plain');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'unlisted'>('public');
  const [categories, setCategories] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) return;

    const categoryList = categories
      .split(',')
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      content_type: contentType,
      visibility,
      categories: categoryList,
    });

    // Reset form
    setTitle('');
    setContent('');
    setCategories('');
  };

  const renderPreview = () => {
    if (contentType === 'text/markdown') {
      const htmlContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-brand-500 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\n/g, '<br>');
      
      return (
        <div 
          className="prose prose-sm max-w-none text-text-1"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      );
    }
    
    return <p className="text-text-1 whitespace-pre-wrap">{content}</p>;
  };

  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: Globe, description: 'Anyone can see' },
    { value: 'friends', label: 'Friends', icon: Users, description: 'Only friends' },
    { value: 'unlisted', label: 'Unlisted', icon: EyeOff, description: 'Only with link' },
  ];

  return (
    <Card variant="prominent" className="p-6">
      <form onSubmit={handleSubmit}>
        {/* Author info */}
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full overflow-hidden neumorphism-sm mr-3">
            {user?.profile_image ? (
              <LoadingImage
                src={user.profile_image}
                alt={user.display_name}
                className="w-full h-full"
                loaderSize={14}
                aspectRatio="1/1"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">
                {user?.display_name.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium text-text-1">{user?.display_name || 'User'}</h3>
            <div className="flex items-center space-x-3 text-sm">
              {/* Content Type Selector */}
              <button
                type="button"
                onClick={() => setContentType('text/plain')}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded ${
                  contentType === 'text/plain'
                    ? 'bg-brand-500 text-white'
                    : 'text-text-2 hover:text-text-1'
                }`}
              >
                <Type size={14} />
                <span>Plain</span>
              </button>
              <button
                type="button"
                onClick={() => setContentType('text/markdown')}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded ${
                  contentType === 'text/markdown'
                    ? 'bg-brand-500 text-white'
                    : 'text-text-2 hover:text-text-1'
                }`}
              >
                <Code size={14} />
                <span>Markdown</span>
              </button>
            </div>
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="ml-auto p-1"
            aria-label="Cancel"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Title Input */}
        <Input
          placeholder="Post title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3 text-lg font-semibold"
          required
        />

        {/* Content Textarea */}
        <div className="mb-3">
          <textarea
            placeholder={
              contentType === 'text/markdown'
                ? "Write your post... (Markdown supported: **bold**, *italic*, [link](url))"
                : "Write your post..."
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 resize-none"
            rows={6}
            required
          />
        </div>

        {/* Categories Input */}
        <Input
          placeholder="Categories (comma separated)"
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          className="mb-4"
        />

        {/* Visibility Selector */}
        <div className="mb-4">
          <label className="text-sm font-medium text-text-1 mb-2 block">
            Who can see this post?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {visibilityOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVisibility(option.value as any)}
                  className={`p-3 rounded-lg border transition-all ${
                    visibility === option.value
                      ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                      : 'border-border-1 text-text-2 hover:border-border-2 hover:text-text-1'
                  }`}
                >
                  <Icon size={20} className="mx-auto mb-1" />
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs opacity-70">{option.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        {showPreview && content && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-4 bg-glass-low rounded-lg"
          >
            <h4 className="text-sm font-medium text-text-2 mb-2">Preview</h4>
            <h3 className="text-lg font-semibold text-text-1 mb-2">{title || 'Untitled'}</h3>
            {renderPreview()}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            disabled={!content}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isLoading}
              disabled={!title.trim() || !content.trim()}
            >
              Post
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};

export default NewPostEditor;