import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileText, Image as ImageIcon, 
  Save, ChevronDown
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import type { Entry } from '../types/models';
import AnimatedButton from './ui/AnimatedButton';
import MarkdownEditor from './MarkdownEditor';
import ImageUploader from './ImageUploader';
import CategoryTags from './CategoryTags';
import PrivacySelector from './PrivacySelector';

type ContentType = 'text/plain' | 'text/markdown' | 'image/png' | 'image/jpeg';
type Visibility = 'public' | 'friends' | 'unlisted';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (post: Entry) => void;
  editingPost?: Entry;
}

function getCookie(name: string): string | null {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1];
  return cookieValue || null;
}


export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingPost,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<ContentType>('text/markdown');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [categories, setCategories] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [expandedSection, setExpandedSection] = useState<'content' | 'tags' | 'privacy' | null>('content');


  
  // Pre-fill form when editing
  React.useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title);
      setContent(editingPost.content);
      setContentType(editingPost.content_type || 'text/markdown' );
      setVisibility(editingPost.visibility);
      setCategories(editingPost.categories || []);
    } else {
      // Reset form when creating new post
      setTitle('');
      setContent('');
      setContentType('text/markdown');
      setVisibility('public');
      setCategories([]);
      setImages([]);
    }
  }, [editingPost]);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("🔁 handleSubmit triggered");

    e.preventDefault();

    if (!contentType) {
    setError("Missing content type");
    return;
    }

    
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    console.log("✅ Passed title check");
    
    if (!content.trim() && contentType && !contentType.startsWith('image/')) {
      setError('Please enter some content');
      return;
    }
    console.log("✅ Passed content check");
    
    if (contentType && contentType.startsWith('image/') && images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    console.log("✅ Passed image check");
    
    setIsLoading(true);
    setError('');

    console.log("title:", title);
    console.log("content:", content);
    console.log("contentType:", contentType);
    console.log("images:", images);

      
    try {
      console.log("📌 editingPost is", editingPost);
      if (editingPost) {
        // Mock post update - replace with API call
        const updatedPost: Entry = {
          ...editingPost,
          title,
          content,
          content_type: contentType,
          visibility,
          categories,
          updated_at: new Date().toISOString(),
        };
        
        // In real implementation: await api.updateEntry(editingPost.id, updatedPost);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        onSuccess?.(updatedPost);
      } else {
        // Mock post creation - replace with API call
        const entryData = {
        title,
        content,
        content_type: contentType,
        visibility,
        categories,
      };

      console.log("🔄 Sending entry data:", entryData);
      console.log("👤 User ID used in endpoint:", user?.id);
      const response = await fetch(`http://localhost:8000/api/authors/${user?.id}/entries/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') || '',
        },
        credentials: 'include',
        body: JSON.stringify(entryData),
      });
      console.log("📡 Got response:", response.status);
      if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create post');
      }
      const newPost = await response.json();
      console.log("✅ Post created:", newPost);
      onSuccess?.(newPost);
      handleClose();
      } 
    } catch (err: any) {
      setError(err.message || `Failed to ${editingPost ? 'update' : 'create'} post`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      // Reset form
      setTitle('');
      setContent('');
      setContentType('text/markdown');
      setVisibility('public');
      setCategories([]);
      setImages([]);
      setError('');
      setExpandedSection('content');
      onClose();
    }
  };

  const contentTypeOptions = [
    { value: 'text/markdown', label: 'Markdown', icon: FileText },
    { value: 'text/plain', label: 'Plain Text', icon: FileText },
    { value: 'image/png', label: 'Image', icon: ImageIcon },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-modal-backdrop"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] glass-card-prominent rounded-lg shadow-xl z-modal overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border-1">
              <h2 className="text-xl font-semibold text-text-1">
                {editingPost ? 'Edit Post' : 'Create New Post'}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-glass-low transition-colors"
              >
                <X size={20} className="text-text-2" />
              </motion.button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your post a title..."
                    className="w-full px-4 py-3 bg-input-bg border border-border-1 rounded-lg text-lg font-medium text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-[var(--primary-violet)] focus:border-transparent transition-all duration-200"
                    autoFocus
                  />
                </div>

                {/* Content Type Selector */}
                <div className="flex items-center space-x-2">
                  {contentTypeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = option.value === 'image/png' 
                      ? contentType?.startsWith('image/') 
                      : contentType === option.value;
                    
                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const value = option.value === 'image/png' ? 'image/png' : option.value;
                          setContentType(value as ContentType);
                        }}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected 
                            ? 'bg-[var(--primary-violet)] text-white' 
                            : 'glass-card-subtle text-text-2 hover:text-text-1'
                        }`}
                      >
                        <Icon size={16} />
                        <span>{option.label}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Expandable Sections */}
                <div className="space-y-3">
                  {/* Content Section */}
                  <motion.div className="glass-card-subtle rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'content' ? null : 'content')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-glass-low transition-colors"
                    >
                      <span className="font-medium text-text-1">Content</span>
                      <motion.div
                        animate={{ rotate: expandedSection === 'content' ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={18} className="text-text-2" />
                      </motion.div>
                    </button>
                    
                    <AnimatePresence>
                      {expandedSection === 'content' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-4 pb-4"
                        >
                          {contentType && contentType.startsWith('image/') ? (
                            <div>
                              <ImageUploader
                                onImagesChange={setImages}
                                maxImages={4}
                                className="mt-3"
                              />
                              {images.length > 0 && (
                                <div className="mt-3">
                                  <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Add a caption..."
                                    className="w-full px-3 py-2 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-[var(--primary-violet)] focus:border-transparent transition-all duration-200 resize-none text-sm"
                                    rows={2}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-3">
                              {contentType === 'text/markdown' ? (
                                <MarkdownEditor
                                  value={content}
                                  onChange={setContent}
                                  placeholder="Write your post content..."
                                  minHeight={200}
                                  maxHeight={400}
                                />
                              ) : (
                                <textarea
                                  value={content}
                                  onChange={(e) => setContent(e.target.value)}
                                  placeholder="Write your post content..."
                                  className="w-full px-4 py-3 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-[var(--primary-violet)] focus:border-transparent transition-all duration-200 resize-none font-mono"
                                  rows={6}
                                />
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Tags Section */}
                  <motion.div className="glass-card-subtle rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'tags' ? null : 'tags')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-glass-low transition-colors"
                    >
                      <span className="font-medium text-text-1">Tags</span>
                      <div className="flex items-center space-x-2">
                        {categories.length > 0 && (
                          <span className="text-sm text-text-2">{categories.length} tags</span>
                        )}
                        <motion.div
                          animate={{ rotate: expandedSection === 'tags' ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={18} className="text-text-2" />
                        </motion.div>
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {expandedSection === 'tags' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-4 pb-4"
                        >
                          <CategoryTags
                            value={categories}
                            onChange={setCategories}
                            maxTags={5}
                            className="mt-3"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Privacy Section */}
                  <motion.div className="glass-card-subtle rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'privacy' ? null : 'privacy')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-glass-low transition-colors"
                    >
                      <span className="font-medium text-text-1">Privacy</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-text-2 capitalize">{visibility}</span>
                        <motion.div
                          animate={{ rotate: expandedSection === 'privacy' ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={18} className="text-text-2" />
                        </motion.div>
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {expandedSection === 'privacy' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-4 pb-4"
                        >
                          <PrivacySelector
                            value={visibility}
                            onChange={(value) => setVisibility(value)}
                            showDescription={false}
                            className="mt-3"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </form>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-border-1">
              <AnimatedButton
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </AnimatedButton>
              <AnimatedButton
                variant="primary"
                onClick={handleSubmit}
                loading={isLoading}
                icon={!isLoading && <Save size={16} />}
              >
                {editingPost ? 'Update Post' : 'Create Post'}
              </AnimatedButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreatePostModal;