import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Entry, Author } from "../types/models";
import { api } from "../services/api";
import { socialService } from "../services/social";
import { useAuth } from "../components/context/AuthContext";
import { useCreatePost } from "../components/context/CreatePostContext";
import { useToast } from "../components/context/ToastContext";
import LoadingImage from "./ui/LoadingImage";
import Card from "./ui/Card";
import { renderMarkdown } from "../utils/markdown";

import AnimatedGradient from "./ui/AnimatedGradient";
import { extractUUID, getEntryUrl, isRemoteEntry } from "../utils/extractId";
import { ShareModal } from "./ShareModal";



// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

interface PostCardProps {
  post: Entry;
  onLike?: (isLiked: boolean) => void;
  onDelete?: (postId: string) => void;
  onUpdate?: (post: Entry) => void;
  isLiked?: boolean;
}

const PostCardComponent: React.FC<PostCardProps> = ({
  post,
  onLike,
  onDelete,
  isLiked = false,
}) => {
  const { user } = useAuth();
  const { openCreatePost } = useCreatePost();
  const { showSuccess, showError, showInfo } = useToast();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(
    post.likes?.count || post.likes_count || 0
  );
  const [commentCount, setCommentCount] = useState(
    post.comments?.count || post.comments_count || 0
  );
  const [showActions, setShowActions] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Memoize the debounced fetch function
  const debouncedFetchLikeData = useMemo(
    () =>
      debounce(async (postId: string) => {
        try {
          const extractedId = extractUUID(postId);
          const data = await api.getEntryLikeStatus(extractedId);
          setLikeCount(data.like_count);
          setLiked(data.liked_by_current_user);
        } catch (error) {
          // Use the data from the post itself as fallback
          setLikeCount(post.likes_count || 0);
          setLiked(post.is_liked || false);
        }
      }, 500),
    [post.likes_count, post.is_liked]
  );

  // Consolidated useEffect for initialization and updates
  useEffect(() => {
    // Initialize state from props and post data
    setLiked(isLiked || post.is_liked || false);
    setCommentCount(post.comments?.count || post.comments_count || 0);

    // Fetch like data if we have a valid post ID
    if (post.id) {
      debouncedFetchLikeData(post.id);
    } else {
      // Use fallback data if no valid ID
      setLikeCount(post.likes?.count || post.likes_count || 0);
      setLiked(isLiked || post.is_liked || false);
    }

    // Set up periodic refresh for like status (every 30 seconds)
    const refreshInterval = setInterval(() => {
      if (post.id) {
        debouncedFetchLikeData(post.id);
      }
    }, 30000); // 30 seconds

    // Listen for post updates from other components
    const handlePostUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { postId, updates } = customEvent.detail;
      if (postId === post.id && updates.comments_count !== undefined) {
        setCommentCount(updates.comments_count);
      }
    };

    // Listen for window focus to refresh like status when user returns to tab
    const handleWindowFocus = () => {
      if (post.id) {
        debouncedFetchLikeData(post.id);
      }
    };

    window.addEventListener("post-update", handlePostUpdate, { passive: true });
    window.addEventListener("focus", handleWindowFocus, { passive: true });

    // Cleanup function
    return () => {
      window.removeEventListener("post-update", handlePostUpdate);
      window.removeEventListener("focus", handleWindowFocus);
      clearInterval(refreshInterval);
    };
  }, [
    post.id,
    post.comments?.count,
    post.comments_count,
    post.likes?.count,
    post.likes_count,
    post.is_liked,
    isLiked,
    debouncedFetchLikeData,
  ]);

  // Memoize author info extraction
  const author = useMemo(
    () => {
      if (typeof post.author === "string") {
        return { displayName: "Unknown", display_name: "Unknown", id: "" } as Author;
      }
      // Ensure displayName exists and isn't empty
      const displayName = post.author.displayName || post.author.display_name;
      if (!displayName) {
        return { ...post.author, displayName: "Unknown User", display_name: "Unknown User" };
      }
      return post.author;
    },
    [post.author]
  );

  const date = new Date(post.published || post.created_at);
  const timeAgo = getTimeAgo(date);

  const handleLike = useCallback(async () => {
    const extractedId = extractUUID(post.id);
    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikeCount((prev) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      if (newLikedState) {
        await api.likeEntry(extractedId);
        showSuccess("Post liked!");
        setLiked(true);
      } else {
        await api.unlikeEntry(extractedId);
        showInfo("Post unliked");
        setLiked(false);
      }
      onLike?.(newLikedState);
    } catch {
      // Revert on error
      setLiked(!newLikedState);
      setLikeCount((prev) =>
        !newLikedState ? prev + 1 : Math.max(0, prev - 1)
      );
      showError("Failed to update like status");
    }
  }, [liked, post.id, showSuccess, showInfo, showError, onLike]);


  const handleShare = useCallback(() => {
    // For public posts, show the share modal with social media options
    if (post.visibility === "PUBLIC") {
      setShowShareModal(true);
    } else {
      // For non-public posts, just copy the link
      const url = `${window.location.origin}/posts/${extractUUID(post.id)}`;
      navigator.clipboard
        .writeText(url)
        .then(() => {
          showSuccess("Post link copied to clipboard!");
        })
        .catch(() => {
          showError("Failed to copy link");
        });
    }
  }, [post.visibility, post.id, showSuccess, showError]);

  const handleEdit = useCallback(() => {
    setShowActions(false);
    openCreatePost(post);
  }, [openCreatePost, post]);

  const handleDelete = useCallback(async () => {
    setShowActions(false);
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        // Mock API call - replace with actual API
        await api.updateEntry(post.id, { visibility: "DELETED" });
        showSuccess("Post deleted successfully");
        // In real implementation, remove post from UI or refresh
        // Optionally remove from UI
        if (typeof onDelete === "function") {
          onDelete(post.id);
        }
      } catch {
        showError("Failed to delete post");
      }
    }
  }, [post.id, showSuccess, showError, onDelete]);

  // Check if current user is the author
  const isOwnPost = user && author.id === user.id;
  // Check if current user is admin
  const isAdmin = user?.is_staff || user?.is_superuser;

  // Handle click outside with proper cleanup
  useEffect(() => {
    if (!showActions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showActions]);

  const renderContent = () => {
    const contentType = post.contentType;
    
    
    // Handle base64 image content types
    if (contentType?.includes('base64') || 
        contentType === 'image/png;base64' || 
        contentType === 'image/jpeg;base64' ||
        contentType === 'application/base64') {
      
      // For both local and remote entries, display the base64 content directly
      let imageSrc = post.content;
      
      // Add data URL prefix if not present
      if (!imageSrc.startsWith('data:')) {
        if (contentType === 'image/png;base64' || contentType === 'image/png') {
          imageSrc = `data:image/png;base64,${imageSrc}`;
        } else if (contentType === 'image/jpeg;base64' || contentType === 'image/jpeg') {
          imageSrc = `data:image/jpeg;base64,${imageSrc}`;
        } else {
          // Default to PNG for generic base64
          imageSrc = `data:image/png;base64,${imageSrc}`;
        }
      }
      
      return (
        <div className="mb-4 rounded-lg overflow-hidden">
          <LoadingImage
            src={imageSrc}
            alt={post.title || "Post image"}
            className="w-full h-auto max-h-96 object-contain rounded-lg"
            fallback={
              <div className="w-full h-48 bg-background-2 flex items-center justify-center text-text-2">
                <FileText size={48} />
              </div>
            }
          />
          {/* Show description as caption if it exists */}
          {post.description && (
            <p className="text-text-2 text-sm mt-2 italic">{post.description}</p>
          )}
        </div>
      );
    }

    if (contentType === "text/markdown") {
      return (
        <div
          className="prose prose-sm max-w-none text-text-1"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />
      );
    }

    // Don't render content as text if it's an image type - it should be handled above
    if (contentType?.startsWith('image/')) {
      return null; // Let the legacy image section handle it or it's already handled above
    }

    return <p className="text-text-1 whitespace-pre-wrap">{post.content}</p>;
  };

  const getVisibilityBadge = () => {
    const badges = [];

    switch (post.visibility) {
      case "FRIENDS":
        badges.push(
          <span
            key="friends"
            className="text-xs bg-cat-mint px-2 py-0.5 rounded-full"
          >
            Friends
          </span>
        );
        break;
      case "UNLISTED":
        badges.push(
          <span
            key="unlisted"
            className="text-xs bg-cat-yellow px-2 py-0.5 rounded-full"
          >
            Unlisted
          </span>
        );
        break;
    }

    // Show admin visibility indicator if viewing a post that wouldn't normally be visible
    if (isAdmin && !isOwnPost && post.visibility === "FRIENDS") {
      badges.push(
        <span
          key="admin"
          className="text-xs bg-gradient-to-r from-[var(--primary-purple)] to-[var(--primary-pink)] text-white px-2 py-0.5 rounded-full flex items-center gap-1"
        >
          <Shield size={10} />
          Admin View
        </span>
      );
    }

    return badges.length > 0 ? badges : null;
  };

  return (
    <>
      <Card variant="main" hoverable className="card-layout">
        <div className="card-content">
          {/* Author info */}
          <div className="flex items-center mb-4">
            <Link
              to={author.id ? `/authors/${extractUUID(author.id)}` : '#'}
              className="flex items-center"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden neumorphism-sm mr-3">
                {(author.profileImage || author.profile_image) ? (
                  <LoadingImage
                    src={author.profileImage || author.profile_image}
                    alt={author.displayName || author.display_name}
                    className="w-full h-full"
                    loaderSize={14}
                    aspectRatio="1/1"
                    fallback={
                      <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">
                        {(author.displayName || author.display_name || "U").charAt(0).toUpperCase()}
                      </div>
                    }
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">
                    {(author.displayName || author.display_name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-text-1">
                  {author.displayName || author.display_name}
                </h3>
                <div className="flex items-center text-xs text-text-2">
                  <span>{timeAgo}</span>
                  {getVisibilityBadge() && (
                    <>
                      <span className="mx-1">·</span>
                      <div className="inline-flex items-center gap-1">
                        {getVisibilityBadge()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Link>

            {(isOwnPost || isAdmin) && (
              <div className="ml-auto relative" ref={actionsRef}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowActions(!showActions)}
                  className="p-2 rounded-lg hover:bg-glass-low transition-colors"
                  aria-label="Post options"
                >
                  <MoreHorizontal size={18} className="text-text-2" />
                </motion.button>

                <AnimatePresence>
                  {showActions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="absolute right-0 mt-2 w-48 glass-card-prominent rounded-lg shadow-lg overflow-hidden z-dropdown"
                    >
                      {isOwnPost && (
                        <motion.button
                          whileHover={{ x: 4 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          }}
                          onClick={handleEdit}
                          className="w-full px-4 py-2.5 text-left text-text-1 hover:bg-glass-low transition-colors flex items-center space-x-2 cursor-pointer"
                        >
                          <Edit size={16} />
                          <span>Edit Post</span>
                        </motion.button>
                      )}

                      {/* Admin controls */}
                      {isAdmin && !isOwnPost && (
                        <>
                          <div className="border-t border-border-1 my-1" />
                          <div className="px-3 py-1.5 text-xs text-text-2 font-medium flex items-center space-x-1">
                            <Shield size={12} />
                            <span>Admin Actions</span>
                          </div>
                          <motion.button
                            whileHover={{ x: 4 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 30,
                            }}
                            onClick={handleEdit}
                            className="w-full px-4 py-2.5 text-left text-text-1 hover:bg-glass-low transition-colors flex items-center space-x-2 cursor-pointer"
                          >
                            <Edit size={16} />
                            <span>Modify Post</span>
                          </motion.button>
                        </>
                      )}

                      <motion.button
                        whileHover={{ x: 4 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                        onClick={handleDelete}
                        className="w-full px-4 py-2.5 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center space-x-2 cursor-pointer"
                      >
                        <Trash2 size={16} />
                        <span>
                          {isAdmin && !isOwnPost
                            ? "Remove Post"
                            : "Delete Post"}
                        </span>
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Post title */}
          <Link to={getEntryUrl(post)}>
            <h2 className="text-xl font-semibold mb-3 text-text-1 hover:text-brand-500 transition-colors">
              {post.title}
            </h2>
          </Link>

          {/* Title/Content separator for markdown posts */}
          {post.contentType === "text/markdown" && (
            <div className="flex items-center mb-4">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-border-1 to-transparent" />
              <div className="mx-3 text-text-2">
                <FileText size={14} className="opacity-50" />
              </div>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-border-1 to-transparent" />
            </div>
          )}

          {/* Post content */}
          <div
            className={`mb-4 ${
              post.contentType === "text/markdown" ? "prose-sm" : ""
            }`}
          >
            {renderContent()}
          </div>

          {/* Unified image handling for all image types */}
          {post.contentType?.startsWith('image/') && !post.contentType.includes('base64') && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <LoadingImage
                  src={
                    // Handle different image sources based on content
                    (post.content && (post.content.startsWith('http://') || post.content.startsWith('https://'))) 
                      ? post.content  // URL-based image
                      : (post.image ? `${post.image}?v=${post.updated_at}` : post.content) // File-based image
                  }
                  alt="Post attachment"
                  className="w-full h-auto max-h-96 object-cover"
                  loaderSize={24}
                />
                {/* Show description as caption if it exists */}
                {post.description && (
                  <p className="text-text-2 text-sm mt-2 italic">{post.description}</p>
                )}
              </div>
            )}

          {/* Categories */}
          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.categories.map((category, index) => {
                const gradientSets = [
                  ["var(--primary-yellow)", "var(--primary-pink)"],
                  ["var(--primary-pink)", "var(--primary-purple)"],
                  ["var(--primary-purple)", "var(--primary-teal)"],
                  ["var(--primary-teal)", "var(--primary-coral)"],
                  ["var(--primary-coral)", "var(--primary-violet)"],
                ];

                return (
                  <Link
                    key={index}
                    to={`/search?category=${encodeURIComponent(category)}`}
                  >
                    <AnimatedGradient
                      gradientColors={gradientSets[index % gradientSets.length]}
                      className="px-3 py-1 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                      duration={20 + index * 2}
                    >
                      #{category}
                    </AnimatedGradient>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Post stats and interaction buttons */}
        <div className="card-footer border-t border-border-1 -mx-5 -mb-5 px-0 rounded-b-xl overflow-hidden">
          <div
            className="flex items-stretch divide-x divide-border-1"
            style={{ borderColor: "var(--border-1)" }}
          >
            <style>{`
            .card-footer .divide-x > :not([hidden]) ~ :not([hidden]) {
              border-left-color: var(--border-1) !important;
              border-left-width: 1px !important;
            }
          `}</style>
            {/* Like Button */}
            <button
              onClick={handleLike}
              className="flex-1 flex items-center justify-center py-3 relative overflow-hidden group transition-all"
              aria-label={liked ? "Unlike this post" : "Like this post"}
            >
              {/* Gradient background on hover or when liked */}
              <div
                className={`absolute inset-0 transition-opacity duration-300 ${
                  liked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary-pink) 0%, var(--primary-purple) 100%)",
                }}
              />
              <div
                className={`relative z-10 flex items-center gap-2 ${
                  liked ? "text-white" : "text-text-2 group-hover:text-white"
                } transition-colors like-button ${liked ? "liked" : ""}`}
              >
                <Heart size={18} fill={liked ? "currentColor" : "none"} />
                <span className="text-sm font-medium">{likeCount}</span>
              </div>
            </button>

            {/* Comment Button */}
            <button
              onClick={() => navigate(getEntryUrl(post))}
              className="flex-1 flex items-center justify-center py-3 relative overflow-hidden group transition-all"
              aria-label="View comments"
            >
              {/* Gradient background on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-blue) 100%)",
                }}
              />
              <div className="relative z-10 flex items-center gap-2 text-text-2 group-hover:text-white transition-colors comment-button">
                <MessageCircle size={18} />
                <span className="text-sm font-medium">{commentCount}</span>
              </div>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center py-3 relative overflow-hidden group transition-all"
              aria-label="Share this post"
            >
              {/* Gradient background on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary-yellow) 0%, var(--primary-coral) 100%)",
                }}
              />
              <div className="relative z-10 flex items-center gap-2 text-text-2 group-hover:text-white transition-all duration-200 share-button">
                <Share2 size={18} />
                <span className="text-sm font-medium">Share</span>
              </div>
            </button>

          </div>
        </div>
      </Card>

      {/* Share Modal for public posts */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={post}
        shareUrl={`${window.location.origin}/posts/${extractUUID(post.id)}`}
      />
    </>
  );
};

// Helper function to format dates
function getTimeAgo(date: Date): string {
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) {
    return "just now";
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else if (secondsAgo < 86400) {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (secondsAgo < 604800) {
    const days = Math.floor(secondsAgo / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Memoized PostCard component
export const PostCard = React.memo(
  PostCardComponent,
  (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
      prevProps.post.id === nextProps.post.id &&
      prevProps.post.likes_count === nextProps.post.likes_count &&
      prevProps.post.comments_count === nextProps.post.comments_count &&
      prevProps.post.visibility === nextProps.post.visibility &&
      prevProps.isLiked === nextProps.isLiked &&
      true // removed saved functionality
    );
  }
);

export default PostCard;
