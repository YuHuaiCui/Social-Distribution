import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Type, Code, Globe, Users, EyeOff, X, Image, Upload } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import LoadingImage from './ui/LoadingImage';
import { useDefaultVisibility, type Visibility } from '../utils/privacy';
import { renderMarkdown } from '../utils/markdown';

interface NewPostEditorProps {
  onSubmit: (postData: {
    title: string;
    content: string;
    contentType: string;
    visibility: string;
    categories?: string[];
    image?: File;
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
  const defaultVisibility = useDefaultVisibility();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<'text/plain' | 'text/markdown' | 'image'>('text/plain');
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility);
  const [categories, setCategories] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  // Update visibility when default changes
  React.useEffect(() => {
    setVisibility(defaultVisibility);
  }, [defaultVisibility]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (e.g., max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert('Image must be less than 5MB');
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Auto-set content type to image
      setContentType('image');
      
      // Set title from filename if not already set
      if (!title.trim()) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExtension);
      }
    }
  };

  const handleImageUrlChange = (url: string) => {
    setImageUrl(url);
    if (url.trim()) {
      setImagePreview(url);
      setImageFile(null); // Clear file if URL is provided
      setContentType('image');
    } else {
      if (!imageFile) {
        setImagePreview(null);
      }
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl('');
    if (contentType === 'image') {
      setContentType('text/plain');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    // For image posts, content can be empty (will use image)
    if (contentType !== 'image' && !content.trim()) return;
    
    // For image posts, require either an image file or URL
    if (contentType === 'image' && !imageFile && !imageUrl.trim()) {
      alert('Please select an image file or enter an image URL');
      return;
    }

    const categoryList = categories
      .split(',')
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);

    // Determine the actual content type for the backend
    let backendContentType: string = contentType;
    if (contentType === 'image') {
      if (imageFile) {
        // File upload - use base64 content types
        const mimeType = imageFile.type;
        if (mimeType === 'image/png') {
          backendContentType = 'image/png;base64';
        } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
          backendContentType = 'image/jpeg;base64';
        } else {
          backendContentType = 'application/base64';
        }
      } else if (imageUrl.trim()) {
        // URL - determine type from URL extension or default to PNG
        const url = imageUrl.trim().toLowerCase();
        if (url.includes('.jpg') || url.includes('.jpeg')) {
          backendContentType = 'image/jpeg';
        } else if (url.includes('.png')) {
          backendContentType = 'image/png';
        } else {
          backendContentType = 'image/png'; // Default
        }
      }
    }

    onSubmit({
      title: title.trim(),
      content: imageUrl.trim() || content.trim(), // Use URL as content if provided
      contentType: backendContentType,
      visibility,
      categories: categoryList,
      image: imageFile || undefined,
    });

    // Reset form
    setTitle('');
    setContent('');
    setCategories('');
    setVisibility(defaultVisibility);
    removeImage();
  };

  const renderPreview = () => {
    if (contentType === 'image' && imagePreview) {
      return (
        <div className="space-y-2">
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="max-w-full h-auto rounded-lg"
            style={{ maxHeight: '300px' }}
          />
          {content && (
            <p className="text-text-1 text-sm mt-2">{content}</p>
          )}
        </div>
      );
    }
    
    if (contentType === 'text/markdown') {
      return (
        <div 
          className="prose prose-sm max-w-none text-text-1"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      );
    }
    
    return <p className="text-text-1 whitespace-pre-wrap">{content}</p>;
  };

  const visibilityOptions = [
    { value: 'PUBLIC', label: 'Public', icon: Globe, description: 'Anyone can see' },
    { value: 'FRIENDS', label: 'Friends', icon: Users, description: 'Only friends' },
    { value: 'UNLISTED', label: 'Unlisted', icon: EyeOff, description: 'Followers & friends' },
  ];

  return (
    <Card variant="prominent" className="p-6">
      <form onSubmit={handleSubmit}>
        {/* Author info */}
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full overflow-hidden neumorphism-sm mr-3">
            {user?.profileImage || user?.profile_image ? (
              <LoadingImage
                src={user.profileImage || user.profile_image}
                alt={user.displayName || user.display_name}
                className="w-full h-full"
                loaderSize={14}
                aspectRatio="1/1"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">
                {user?.displayName || user?.display_name.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium text-text-1">{user?.displayName || user?.display_name || 'User'}</h3>
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
              <button
                type="button"
                onClick={() => setContentType('image')}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded ${
                  contentType === 'image'
                    ? 'bg-brand-500 text-white'
                    : 'text-text-2 hover:text-text-1'
                }`}
              >
                <Image size={14} />
                <span>Image</span>
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

        {/* Image Upload Section */}
        {contentType === 'image' && (
          <div className="mb-3 space-y-4">
            {/* Image URL Input - Always visible */}
            <div>
              <Input
                placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                value={imageUrl}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                className="mb-2"
              />
              <p className="text-xs text-text-2">Or upload a file below</p>
            </div>
            
            {/* File Upload - Always visible */}
            {!imagePreview ? (
              <div className="border-2 border-dashed border-border-1 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload size={48} className="text-text-2" />
                  <p className="text-text-1">Click to upload an image</p>
                  <p className="text-sm text-text-2">PNG, JPG, JPEG up to 5MB</p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img 
                  src={imagePreview!} 
                  alt="Selected" 
                  className="w-full h-auto rounded-lg"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X size={16} />
                </button>
                <div className="mt-2 text-sm text-text-2">
                  {imageFile ? `File: ${imageFile.name}` : `URL: ${imageUrl}`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Textarea */}
        <div className="mb-3">
          <textarea
            placeholder={
              contentType === 'image'
                ? "Optional caption for your image..."
                : contentType === 'text/markdown'
                ? "Write your post... (Markdown supported: **bold**, *italic*, [link](url))"
                : "Write your post..."
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 resize-none"
            rows={contentType === 'image' ? 3 : 6}
            required={contentType !== 'image'}
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
        {showPreview && (title || content || imagePreview) && (
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
            disabled={!title && !content && !imagePreview}
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
              disabled={!title.trim() || (contentType !== 'image' && !content.trim()) || (contentType === 'image' && !imageFile && !imageUrl.trim())}
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