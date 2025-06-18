import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Image as ImageIcon,
  Save,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { entryService } from "../services";
import type { Entry, CreateEntryData } from "../types";
import AnimatedButton from "./ui/AnimatedButton";
import MarkdownEditor from "./MarkdownEditor";
import ImageUploader from "./ImageUploader";
import type { ImageUploadResponse } from "../services/image";
import CategoryTags from "./CategoryTags";
import PrivacySelector from "./PrivacySelector";
import { useDefaultVisibility, type Visibility } from "../utils/privacy";
import { usePosts } from "./context/PostsContext";

type ContentType = "text/plain" | "text/markdown" | "image/png" | "image/jpeg";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (post: Entry) => void;
  editingPost?: Entry;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingPost,
}) => {
  const defaultVisibility = useDefaultVisibility();
  const { triggerRefresh } = usePosts();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<ContentType>("text/markdown");
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility);
  const [categories, setCategories] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [expandedSection, setExpandedSection] = useState<
    "content" | "tags" | "privacy" | null
  >("content");
  // Pre-fill form when editing
  React.useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title);
      setContent(editingPost.content);
      setContentType(editingPost.content_type || "text/markdown");
      // Ensure visibility is one of our valid types ('public', 'friends', 'unlisted')
      const validVisibilities: Visibility[] = ["public", "friends", "unlisted"];
      setVisibility(
        validVisibilities.includes(editingPost.visibility as Visibility)
          ? (editingPost.visibility as Visibility)
          : "public"
      );
      setCategories(editingPost.categories || []);
    } else {
      // Reset form when creating new post
      setTitle("");
      setContent("");
      setContentType("text/markdown");
      setVisibility(defaultVisibility);
      setCategories([]);
      setImages([]);
    }
  }, [editingPost, defaultVisibility]);

  // Update visibility when default changes for new posts
  React.useEffect(() => {
    if (!editingPost) {
      setVisibility(defaultVisibility);
    }
  }, [defaultVisibility, editingPost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contentType) {
      setError("Missing content type");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!content.trim() && contentType && !contentType.startsWith("image/")) {
      setError("Please enter some content");
      return;
    }

    if (
      contentType &&
      contentType.startsWith("image/") &&
      images.length === 0
    ) {
      setError("Please upload at least one image");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const entryData: CreateEntryData = {
        title,
        content: contentType.startsWith("image/") && uploadedImageUrls.length > 0 
          ? uploadedImageUrls[0]  // Use the uploaded image URL as content
          : content,
        content_type: contentType,
        visibility,
        categories,
        // Don't include image file if we're using uploaded URLs
        ...(images.length > 0 && uploadedImageUrls.length === 0 && { image: images[0] }),
      };
      if (editingPost) {
        // Update existing post
        console.log("editingPost:", editingPost);
        if (!editingPost.id) {
          console.error("Editing post is missing an ID");
          setError("Cannot update: missing post ID");
          return;
        }
        const id = editingPost.id.includes("/") ? editingPost.id.split("/").pop() : editingPost.id;
        console.log("[PATCH] Entry ID used for update:", id);
        if (!id) {
          setError("Cannot update: invalid post ID");
          setIsLoading(false);
          return;
        }
        const updatedPost = await entryService.updateEntry(
          id,
          entryData
        );

        onSuccess?.(updatedPost);
        triggerRefresh(); // Trigger posts refresh
        handleClose();
        console.log("Post updated successfully, refreshing feed...");
      } else {
        // Create new post
        const newPost = await entryService.createEntry(entryData);

        onSuccess?.(newPost);
        triggerRefresh(); // Trigger posts refresh
        console.log("Post created successfully, refreshing feed...");
        handleClose();
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(
        errorMessage || `Failed to ${editingPost ? "update" : "create"} post`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      // Reset form
      setTitle("");
      setContent("");
      setContentType("text/markdown");
      setVisibility(defaultVisibility);
      setCategories([]);
      setImages([]);
      setUploadedImageUrls([]);
      setError("");
      setExpandedSection("content");
      setIsFullscreen(false);
      onClose();
    }
  };

  const contentTypeOptions = [
    { value: "text/markdown", label: "Markdown", icon: FileText },
    { value: "text/plain", label: "Plain Text", icon: FileText },
    { value: "image/png", label: "Image", icon: ImageIcon },
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              // Animate the style properties
              left: isFullscreen ? "0%" : "50%",
              top: isFullscreen ? "0%" : "50%",
              x: isFullscreen ? "0%" : "-50%",
              y: isFullscreen ? "0%" : "-50%",
              width: isFullscreen ? "100vw" : "min(48rem, 100vw)",
              height: isFullscreen ? "100vh" : "auto",
              maxHeight: isFullscreen ? "100vh" : "100vh",
              borderRadius: isFullscreen ? "0px" : "8px",
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 0.8,
            }}
            className="fixed glass-card-prominent shadow-xl z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border-1">
              <h2 className="text-xl font-semibold text-text-1">
                {editingPost ? "Edit Post" : "Create New Post"}
              </h2>
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-lg hover:bg-glass-low transition-colors"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 size={20} className="text-text-2" />
                  ) : (
                    <Maximize2 size={20} className="text-text-2" />
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-glass-low transition-colors"
                >
                  <X size={20} className="text-text-2" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
                    const isSelected =
                      option.value === "image/png"
                        ? contentType?.startsWith("image/")
                        : contentType === option.value;

                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const value =
                            option.value === "image/png"
                              ? "image/png"
                              : option.value;
                          setContentType(value as ContentType);
                        }}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? "bg-[var(--primary-violet)] text-white"
                            : "glass-card-subtle text-text-2 hover:text-text-1"
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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedSection(
                          expandedSection === "content" ? null : "content"
                        );
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-glass-low transition-colors"
                    >
                      <span className="font-medium text-text-1">Content</span>
                      <motion.div
                        animate={{
                          rotate: expandedSection === "content" ? 180 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={18} className="text-text-2" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {expandedSection === "content" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-4 pb-4"
                        >
                          {contentType && contentType.startsWith("image/") ? (
                            <div>
                              <ImageUploader
                                onImagesChange={setImages}
                                onImagesUploaded={(uploadedImages) => {
                                  // Store the URLs of uploaded images
                                  const urls = uploadedImages.map(img => img.url);
                                  setUploadedImageUrls(urls);
                                  // If we have uploaded images, use the first URL as content
                                  if (urls.length > 0 && !content) {
                                    setContent(urls[0]);
                                  }
                                }}
                                maxImages={4}
                                className="mt-3"
                                uploadToServer={true}
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
                              {contentType === "text/markdown" ? (
                                <MarkdownEditor
                                  value={content}
                                  onChange={setContent}
                                  placeholder="Write your post content..."
                                  minHeight={isFullscreen ? 400 : 200}
                                  maxHeight={isFullscreen ? 800 : 400}
                                />
                              ) : (
                                <textarea
                                  value={content}
                                  onChange={(e) => setContent(e.target.value)}
                                  placeholder="Write your post content..."
                                  className="w-full px-4 py-3 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-[var(--primary-violet)] focus:border-transparent transition-all duration-200 resize-none font-mono"
                                  rows={isFullscreen ? 20 : 6}
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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedSection(
                          expandedSection === "tags" ? null : "tags"
                        );
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-glass-low transition-colors"
                    >
                      <span className="font-medium text-text-1">Tags</span>
                      <div className="flex items-center space-x-2">
                        {categories.length > 0 && (
                          <span className="text-sm text-text-2">
                            {categories.length} tags
                          </span>
                        )}
                        <motion.div
                          animate={{
                            rotate: expandedSection === "tags" ? 180 : 0,
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={18} className="text-text-2" />
                        </motion.div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedSection === "tags" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
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
                  <motion.div className="glass-card-subtle rounded-lg overflow-visible">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedSection(
                          expandedSection === "privacy" ? null : "privacy"
                        );
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-glass-low transition-colors"
                    >
                      <span className="font-medium text-text-1">Privacy</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-text-2 capitalize">
                          {visibility}
                        </span>
                        <motion.div
                          animate={{
                            rotate: expandedSection === "privacy" ? 180 : 0,
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={18} className="text-text-2" />
                        </motion.div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedSection === "privacy" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-4 pb-4"
                          onClick={(e) => e.stopPropagation()}
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
                    animate={{ opacity: 1, height: "auto" }}
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
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
                loading={isLoading}
                icon={!isLoading && <Save size={16} />}
              >
                {editingPost ? "Update Post" : "Create Post"}
              </AnimatedButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreatePostModal;
