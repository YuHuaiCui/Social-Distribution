import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Image as ImageIcon,
  Save,
  X,
  AlertCircle,
} from "lucide-react";
import BackgroundEffects from "../components/ui/BackgroundEffects";
import AnimatedButton from "../components/ui/AnimatedButton";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import MarkdownEditor from "../components/MarkdownEditor";
import ImageUploader from "../components/ImageUploader";
import CategoryTags from "../components/CategoryTags";
import PrivacySelector from "../components/PrivacySelector";
import { entryService } from "../services/entry/index";
import { useDefaultVisibility, type Visibility } from "../utils/privacy";

import type { CreateEntryData } from "../types/entry/index";
import type { ContentType } from "../types/common/index";

export const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const defaultVisibility = useDefaultVisibility();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<ContentType>("text/markdown");
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility);
  const [categories, setCategories] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Update visibility when default changes
  React.useEffect(() => {
    setVisibility(defaultVisibility);
  }, [defaultVisibility]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!content.trim() && !contentType.startsWith("image/")) {
      setError("Please enter some content");
      return;
    }

    if (contentType.startsWith("image/") && images.length === 0 && imageUrls.length === 0) {
      setError("Please upload at least one image or provide an image URL");
      return;
    }

    setIsLoading(true);
    setError("");

    // Handle URL images vs file images
    let entryData: CreateEntryData;
    
    if (contentType.startsWith("image/")) {
      if (imageUrls.length > 0) {
        // URL-based image - put URL in content field
        entryData = {
          title: title.trim(),
          content: imageUrls[0], // Put URL in content field
          contentType: contentType,
          visibility,
          categories: categories.length > 0 ? categories : undefined,
        };
      } else if (images.length > 0) {
        // File-based image - put file in image field
        entryData = {
          title: title.trim(),
          content: content.trim() || "Image post", // Use caption for file-based images
          contentType: contentType,
          visibility,
          categories: categories.length > 0 ? categories : undefined,
          image: images[0],
        };
      } else {
        // Should not happen due to validation
        entryData = {
          title: title.trim(),
          content: content.trim(),
          contentType: contentType,
          visibility,
          categories: categories.length > 0 ? categories : undefined,
        };
      }
    } else {
      // Text-based content
      entryData = {
        title: title.trim(),
        content: content.trim(),
        contentType: contentType,
        visibility,
        categories: categories.length > 0 ? categories : undefined,
      };
    }

    try {
      const response = await entryService.createEntry(entryData);

      // Mock success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate to the new post or home
      navigate("/home");
    } catch (err: any) {
      setError("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const contentTypeOptions = [
    { value: "text/markdown", label: "Markdown", icon: FileText },
    { value: "text/plain", label: "Plain Text", icon: FileText },
    { value: "image/png", label: "Image Post", icon: ImageIcon },
  ];

  return (
    <div className="min-h-screen py-6">
      <BackgroundEffects />

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text-1">Create New Post</h1>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(-1);
              }}
              className="p-2 rounded-lg hover:bg-glass-low transition-colors"
            >
              <X size={24} className="text-text-2" />
            </motion.button>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-4"
          >
            <Card
              variant="main"
              className="p-4 border-red-500/30 bg-red-500/10"
            >
              <div className="flex items-center space-x-2 text-red-500">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            </Card>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="prominent" className="p-6">
              <Input
                label="Post Title"
                type="text"
                placeholder="Enter a catchy title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-lg font-medium"
              />
            </Card>
          </motion.div>

          {/* Content Type Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card variant="prominent" className="p-6">
              <label className="block text-sm font-medium text-text-2 mb-4">
                Content Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {contentTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = contentType === option.value;

                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        setContentType(option.value as ContentType)
                      }
                      className={`
                        p-4 rounded-lg border-2 transition-all
                        ${
                          isSelected
                            ? "border-[var(--primary-violet)] bg-[var(--primary-violet)]/10"
                            : "border-border-1 hover:border-border-2"
                        }
                      `}
                    >
                      <Icon
                        size={24}
                        className={`mx-auto mb-2 ${
                          isSelected
                            ? "text-[var(--primary-violet)]"
                            : "text-text-2"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          isSelected ? "text-text-1" : "text-text-2"
                        }`}
                      >
                        {option.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </Card>
          </motion.div>

          {/* Content Editor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="prominent" className="p-6">
              {contentType.startsWith("image/") ? (
                <div>
                  <label className="block text-sm font-medium text-text-2 mb-4">
                    Upload Images
                  </label>
                  <ImageUploader 
                    onImagesChange={setImages} 
                    onUrlImagesChange={setImageUrls} 
                    maxImages={10} 
                  />
                  {(images.length > 0 || imageUrls.length > 0) && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-text-2 mb-2">
                        Image Caption (Optional)
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Add a caption for your images..."
                        className="w-full px-4 py-3 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-[var(--primary-violet)] focus:border-transparent transition-all duration-200 resize-none"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-text-2 mb-4">
                    Content
                  </label>
                  {contentType === "text/markdown" ? (
                    <MarkdownEditor
                      value={content}
                      onChange={setContent}
                      placeholder="Write your post content in Markdown..."
                      minHeight={300}
                    />
                  ) : (
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your post content..."
                      className="w-full px-4 py-3 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-[var(--primary-violet)] focus:border-transparent transition-all duration-200 resize-none font-mono"
                      rows={12}
                    />
                  )}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="prominent" className="p-6">
              <label className="block text-sm font-medium text-text-2 mb-4">
                Categories
              </label>
              <CategoryTags
                value={categories}
                onChange={setCategories}
                maxTags={10}
                placeholder="Add categories to help others discover your post..."
              />
            </Card>
          </motion.div>

          {/* Privacy Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card variant="prominent" className="p-6 overflow-visible">
              <label className="block text-sm font-medium text-text-2 mb-4">
                Post Visibility
              </label>
              <div className="relative z-10">
                <PrivacySelector
                  value={visibility}
                  onChange={(value) => setVisibility(value)}
                />
              </div>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-end space-x-4 relative z-0"
          >
            <AnimatedButton
              type="button"
              variant="ghost"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                navigate(-1);
              }}
              disabled={isLoading}
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              icon={<Save size={20} />}
            >
              Create Post
            </AnimatedButton>
          </motion.div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostPage;
