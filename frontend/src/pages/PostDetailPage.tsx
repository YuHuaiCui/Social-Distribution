import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Edit,
  Trash2,
  Send,
  Clock,
  Hash,
  FileText,
  AlignLeft,
} from "lucide-react";
import { useAuth } from "../components/context/AuthContext";
import { useToast } from "../components/context/ToastContext";
import { useCreatePost } from "../components/context/CreatePostContext";
import type { Entry, Comment, Author } from "../types/models";
import AnimatedButton from "../components/ui/AnimatedButton";
import Card from "../components/ui/Card";
import Avatar from "../components/Avatar/Avatar";
import Loader from "../components/ui/Loader";
import LoadingImage from "../components/ui/LoadingImage";
import { entryService } from "../services/entry";
import { socialService } from "../services/social";
import { renderMarkdown } from "../utils/markdown";
import { extractUUID, isRemoteEntry, getEntryIdentifier } from "../utils/extractId";

interface CommentWithReplies extends Comment {
  replies?: Comment[];
  likes_count?: number;
  is_liked?: boolean;
}

export const PostDetailPage: React.FC = () => {
  const { postId, entryUrl } = useParams<{ postId?: string; entryUrl?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const { openCreatePost } = useCreatePost();
  const [post, setPost] = useState<Entry | null>(null);
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentContentType, setCommentContentType] = useState<
    "text/plain" | "text/markdown"
  >("text/plain");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isRemotePost, setIsRemotePost] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  // Type guard to check if author is an Author object
  const isAuthorObject = (author: unknown): author is Author => {
    return (
      author !== null &&
      typeof author === "object" &&
      "id" in (author as Record<string, unknown>)
    );
  };
  const fetchPostDetails = useCallback(async () => {
    const currentPostId = postId || entryUrl;
    if (!currentPostId) return;

    setIsLoading(true);

    // Determine if this is a remote entry
    let actualEntryUrl: string;
    let isRemote = false;
    
    if (entryUrl) {
      // This came from the remote route - decode the URL
      actualEntryUrl = decodeURIComponent(entryUrl);
      isRemote = true;
      setIsRemotePost(true);
    } else if (postId && postId.startsWith('remote/')) {
      // Legacy support for remote/ prefix in postId
      actualEntryUrl = decodeURIComponent(postId.replace('remote/', ''));
      isRemote = true;
      setIsRemotePost(true);
    } else {
      // This is a local entry
      actualEntryUrl = currentPostId;
      setIsRemotePost(false);
    }

    let fetchedPost: Entry;
    
    try {
      if (isRemote) {
        // For remote entries, fetch from the remote node
        fetchedPost = await entryService.fetchRemoteEntry(actualEntryUrl);
      } else {
        // For local entries, use existing logic
        let extractedId = actualEntryUrl;
        if (actualEntryUrl.includes("/")) {
          const segments = actualEntryUrl.split("/");
          extractedId = segments[segments.length - 1] || segments[segments.length - 2];
        }

        // Validate UUID format for local entries
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(extractedId)) {
          setPost(null);
          setIsLoading(false);
          return;
        }

        try {
          fetchedPost = await entryService.getEntry(extractedId);
        } catch (error) {
          console.error("Error fetching post:", error);
          
          // Fallback: try fetching through author's endpoint
          if (user?.id) {
            try {
              const response = await entryService.getEntriesByAuthor(user.id);
              const authorPost = response.src.find((entry) => entry.id === extractedId);
              
              if (authorPost) {
                fetchedPost = authorPost;
              } else {
                setPost(null);
                setIsLoading(false);
                return;
              }
            } catch (authorError) {
              console.error("Error fetching from author entries:", authorError);
              setPost(null);
              setIsLoading(false);
              return;
            }
          } else {
            setPost(null);
            setIsLoading(false);
            return;
          }
        }
      }
      
      setPost(fetchedPost);
    } catch (error) {
      console.error("Error fetching post details:", error);
      setPost(null);
      setIsLoading(false);
      return;
    }

    // Fetch comments - different logic for remote vs local entries
    try {
      if (isRemote) {
        // For remote entries, get only local comments
        const commentsResponse = await entryService.getLocalCommentsForRemoteEntry(actualEntryUrl);
        
        // Convert to the expected format
        const parentComments: CommentWithReplies[] = [];
        const commentReplies: Record<string, Comment[]> = {};

        commentsResponse.items.forEach((comment) => {
          if (comment.parent) {
            const parentId = typeof comment.parent === "string" ? comment.parent : comment.parent.id;
            if (!commentReplies[parentId]) {
              commentReplies[parentId] = [];
            }
            commentReplies[parentId].push(comment);
          } else {
            parentComments.push({ ...comment, replies: [] });
          }
        });

        parentComments.forEach((comment) => {
          if (commentReplies[comment.id]) {
            comment.replies = commentReplies[comment.id];
          }
        });

        setComments(parentComments);
      } else {
        // For local entries, use existing logic
        const extractedId = extractUUID(actualEntryUrl);
        const commentsResponse = await entryService.getComments(extractedId);

        const parentComments: CommentWithReplies[] = [];
        const commentReplies: Record<string, Comment[]> = {};

        commentsResponse.results.forEach((comment) => {
          if (comment.parent) {
            const parentId = typeof comment.parent === "string" ? comment.parent : comment.parent.id;
            if (!commentReplies[parentId]) {
              commentReplies[parentId] = [];
            }
            commentReplies[parentId].push(comment);
          } else {
            parentComments.push({ ...comment, replies: [] });
          }
        });

        parentComments.forEach((comment) => {
          if (commentReplies[comment.id]) {
            comment.replies = commentReplies[comment.id];
          }
        });

        // Fetch like status for each comment (only for local entries)
        const commentsWithLikes = await Promise.all(
          parentComments.map(async (comment) => {
            try {
              const likeStatus = await socialService.getCommentLikeStatus(comment.id);
              return {
                ...comment,
                likes_count: likeStatus.like_count,
                is_liked: likeStatus.liked_by_current_user,
              };
            } catch (error) {
              console.error(`Error fetching like status for comment ${comment.id}:`, error);
              return comment;
            }
          })
        );

        setComments(commentsWithLikes);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    }

    // Get like status (only for local entries)
    if (!isRemote && user?.id) {
      try {
        const extractedId = extractUUID(actualEntryUrl);
        const likeData = await socialService.getEntryLikes(extractedId);
        const liked_by_current_user = likeData.src.some((like) => like.author.id === user.id);
        setIsLiked(liked_by_current_user);
      } catch (error) {
        console.error("Error fetching like status:", error);
        setIsLiked(fetchedPost.is_liked || false);
      }
    } else {
      // For remote entries, disable liking for now
      setIsLiked(false);
    }

    setIsLoading(false);
  }, [postId, entryUrl, user?.id]);

  useEffect(() => {
    fetchPostDetails();
  }, [fetchPostDetails]);

  // Handle click outside to close actions menu
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showActions]);

  const handleLike = async () => {
    const currentPostId = postId || entryUrl;
    if (!currentPostId || !post || isRemotePost) return; // Disable liking for remote posts

    // Extract UUID from postId if it's a URL
    const extractedId = extractUUID(currentPostId);

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);

    // Optimistic update
    setPost({
      ...post,
      likes_count: newLikedState
        ? (post.likes_count || 0) + 1
        : Math.max((post.likes_count || 0) - 1, 0),
    });

    try {
      // Make the actual API call using proper endpoints
      if (newLikedState) {
        await socialService.likeEntry(extractedId);
      } else {
        await socialService.unlikeEntry(extractedId);
      }
    } catch (err) {
      console.error("Error updating like status:", err);

      // Revert on error
      setIsLiked(!newLikedState);
      setPost({
        ...post,
        likes_count: !newLikedState
          ? (post.likes_count || 0) + 1
          : Math.max((post.likes_count || 0) - 1, 0),
      });
    }
  };

  const handleShare = async () => {
    if (!post) return;

    const shareUrl = `${window.location.origin}/posts/${extractUUID(post.id)}`;
    const shareText = `Check out this post: ${post.title}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        // You might want to show a toast notification here
        alert("Link copied to clipboard!");
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentPostId = postId || entryUrl;
    if (!commentText.trim() || !currentPostId || !post) return;

    setIsSubmitting(true);
    try {
      const commentData = {
        content: commentText,
        contentType: commentContentType,
      };

      let newComment: Comment;

      if (isRemotePost) {
        // For remote entries, get the entry URL and use remote comment endpoint
        const actualEntryUrl = entryUrl ? decodeURIComponent(entryUrl) : decodeURIComponent(currentPostId.replace('remote/', ''));
        newComment = await entryService.createCommentOnRemoteEntry(actualEntryUrl, commentData);
      } else {
        // For local entries, use existing logic
        let extractedId = currentPostId;
        if (currentPostId.includes("/")) {
          const segments = currentPostId.split("/");
          extractedId = segments[segments.length - 1] || segments[segments.length - 2];
        }

        if (replyingTo) {
          // For now we'll submit it as a regular comment
          newComment = await entryService.createComment(extractedId, commentData);
          
          // Update the comments array with the new reply
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === replyingTo
                ? {
                    ...comment,
                    replies: [...(comment.replies || []), newComment],
                  }
                : comment
            )
          );
        } else {
          newComment = await entryService.createComment(extractedId, commentData);
          // Add to the comments list
          setComments((prev) => [newComment as CommentWithReplies, ...prev]);
        }
      }

      if (isRemotePost && !replyingTo) {
        // Add to the comments list (only for remote posts and not replies)
        setComments((prev) => [newComment as CommentWithReplies, ...prev]);
      }

      // Reset the form
      setCommentText("");
      setReplyingTo(null);

      // Update the comment count
      const newCommentCount = (post.comments_count || 0) + 1;
      setPost({ ...post, comments_count: newCommentCount });

      // Dispatch custom event to update comment count in other components
      window.dispatchEvent(
        new CustomEvent("post-update", {
          detail: {
            postId: post.id,
            updates: { comments_count: newCommentCount },
          },
        })
      );

    } catch (err) {
      console.error("Error submitting comment:", err);
      showError("Failed to submit comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setShowActions(false);
    // Open edit modal instead of navigating
    if (post) {
      openCreatePost(post);
    }
  };

  const handleDelete = async () => {
    const currentPostId = postId || entryUrl;
    if (!post || !currentPostId) return;

    setShowActions(false);
    if (
      window.confirm(
        "Are you sure you want to delete this post? This action cannot be undone."
      )
    ) {
      try {
        const extractedId = extractUUID(currentPostId);
        await entryService.deleteEntry(extractedId);
        showSuccess("Post deleted successfully");
        navigate("/"); // Navigate back to home page
      } catch (error) {
        console.error("Error deleting post:", error);
        showError("Failed to delete post");
      }
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user?.id) {
      showError("Please sign in to like comments");
      return;
    }

    try {
      // Find the comment
      const commentIndex = comments.findIndex((c) => c.id === commentId);
      if (commentIndex === -1) return;

      const comment = comments[commentIndex];
      const wasLiked = comment.is_liked;

      // Optimistic update
      const updatedComments = [...comments];
      updatedComments[commentIndex] = {
        ...comment,
        is_liked: !wasLiked,
        likes_count: wasLiked
          ? (comment.likes_count || 1) - 1
          : (comment.likes_count || 0) + 1,
      };
      setComments(updatedComments);

      // API call
      if (wasLiked) {
        await socialService.unlikeComment(commentId);
      } else {
        await socialService.likeComment(commentId);
      }
    } catch (error) {
      console.error("Error liking comment:", error);
      showError("Failed to like comment");
      // Revert on error
      const comment = comments.find((c) => c.id === commentId);
      if (comment) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  is_liked: !c.is_liked,
                  likes_count: c.is_liked
                    ? (c.likes_count || 1) - 1
                    : (c.likes_count || 0) + 1,
                }
              : c
          )
        );
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const renderContent = (content: string, contentType: string) => {
    if (contentType === "text/markdown") {
      return (
        <div
          className="prose prose-lg max-w-none text-text-1"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      );
    }

    // Handle base64 image content types
    if (contentType?.includes('base64') || 
        contentType === 'image/png;base64' || 
        contentType === 'image/jpeg;base64' ||
        contentType === 'application/base64') {
      
      // For both local and remote entries, display the base64 content directly
      let imageSrc = content;
      
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
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden">
            <LoadingImage
              src={imageSrc}
              alt={post?.title || "Post image"}
              className="w-full h-auto max-h-[600px] object-contain bg-glass-low"
              fallback={
                <div className="w-full h-64 bg-background-2 flex items-center justify-center text-text-2">
                  <FileText size={64} />
                </div>
              }
            />
          </div>
          {post?.description && (
            <p className="text-text-1 text-center italic">{post.description}</p>
          )}
        </div>
      );
    }

    // Handle all image types that aren't base64 - unified handling like PostCard
    if (contentType?.startsWith('image/') && !contentType.includes('base64')) {
      return (
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden">
            <LoadingImage
              src={
                // Handle different image sources based on content
                (content && (content.startsWith('http://') || content.startsWith('https://'))) 
                  ? content  // URL-based image
                  : (post?.image ? `${post.image}?v=${post.updated_at}` : content) // File-based image with cache busting
              }
              alt={post?.title || "Post image"}
              className="w-full h-auto max-h-[600px] object-contain bg-glass-low"
              fallback={
                <div className="w-full h-64 bg-background-2 flex items-center justify-center text-text-2">
                  <FileText size={64} />
                </div>
              }
            />
          </div>
          {post?.description && (
            <p className="text-text-1 text-center italic">{post.description}</p>
          )}
        </div>
      );
    }
    
    return <p className="text-text-1 whitespace-pre-wrap">{content}</p>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" message="Loading post..." />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card variant="main" className="p-8 text-center">
          {" "}
          <h2 className="text-xl font-semibold text-text-1 mb-2">
            Post not available
          </h2>
          <p className="text-text-2 mb-4">
            The post you're looking for either doesn't exist or you don't have
            permission to view it.
          </p>
          <AnimatedButton onClick={() => navigate("/")} variant="primary">
            Go Home
          </AnimatedButton>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-text-2 hover:text-text-1 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        {!isRemotePost && isAuthorObject(post.author) && post.author.id === user?.id && (
          <div className="relative" ref={actionsRef}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg hover:bg-glass-low transition-colors"
            >
              <MoreVertical size={20} className="text-text-2" />
            </motion.button>

            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute right-0 mt-2 w-48 glass-card-prominent rounded-lg shadow-lg overflow-hidden z-10"
                >
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2 text-left text-text-1 hover:bg-glass-low transition-colors flex items-center space-x-2"
                  >
                    <Edit size={16} />
                    <span>Edit Post</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center space-x-2"
                  >
                    <Trash2 size={16} />
                    <span>Delete Post</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Post Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card
          variant="main"
          className="p-6 md:p-8 mb-6 bg-[rgba(var(--glass-rgb),0.4)] backdrop-blur-xl"
        >
          {/* Author Info */}
          <div className="flex items-center space-x-3 mb-6">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Avatar
                imgSrc={
                  isAuthorObject(post.author)
                    ? post.author.profileImage || post.author.profile_image
                    : undefined
                }
                alt={
                  isAuthorObject(post.author)
                    ? post.author.displayName || post.author.display_name
                    : "Author"
                }
                size="lg"
              />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-1">
                {isAuthorObject(post.author)
                  ? post.author.displayName || post.author.display_name
                  : "Unknown Author"}
              </h3>
              <div className="flex items-center space-x-3 text-sm text-text-2">
                <span>
                  {isAuthorObject(post.author)
                    ? post.author.username
                    : "unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-text-1 mb-4">
            {post.title}
          </h1>

          {/* Categories */}
          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.categories.map((category, index) => (
                <motion.span
                  key={category}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm glass-card-subtle text-text-2"
                >
                  <Hash size={12} className="mr-1" />
                  {category}
                </motion.span>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="mb-8">
                    {renderContent(post.content, post.contentType)}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-border-1">
            <div className="flex items-center space-x-4">
              {user?.id && !isRemotePost ? (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLike}
                  className={`flex items-center space-x-2 ${
                    isLiked
                      ? "text-[var(--primary-pink)]"
                      : "text-text-2 hover:text-text-1"
                  } transition-colors`}
                >
                  <motion.div
                    animate={isLiked ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                  </motion.div>
                  <span className="text-sm font-medium">
                    {post.likes_count || 0}
                  </span>
                </motion.button>
              ) : (
                <div className="flex items-center space-x-2 text-text-2">
                  <Heart size={20} />
                  <span className="text-sm font-medium">
                    {post.likes_count || 0}
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-2 text-text-2">
                <MessageCircle size={20} />
                <span className="text-sm font-medium">
                  {post.comments_count || 0}
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleShare}
                className="text-text-2 hover:text-text-1 transition-colors"
              >
                <Share2 size={20} />
              </motion.button>
            </div>
          </div>
        </Card>

        {/* Comments Section */}
        <Card
          variant="main"
          className="p-6 bg-[rgba(var(--glass-rgb),0.35)] backdrop-blur-xl"
        >
          <h2 className="text-xl font-semibold text-text-1 mb-6">
            Comments ({comments.length})
          </h2>

          {/* Comment Form - Available for both local and remote posts */}
          {user?.id && (
            <form onSubmit={handleSubmitComment} className="mb-6">
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-2 text-sm text-text-2"
                >
                  Replying to comment...
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="ml-2 text-[var(--primary-violet)] hover:underline"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}

              <div className="flex space-x-3">
                <Avatar
                  imgSrc={user?.profileImage || user?.profile_image}
                  alt={user?.displayName || user?.display_name || "User"}
                  size="md"
                />
                <div className="flex-1">
                  {/* Content Type Toggle */}
                  <div className="flex items-center space-x-2 mb-2">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCommentContentType("text/plain")}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-all ${
                        commentContentType === "text/plain"
                          ? "bg-[var(--primary-violet)]/20 text-[var(--primary-violet)] border border-[var(--primary-violet)]"
                          : "text-text-2 hover:text-text-1 border border-transparent"
                      }`}
                    >
                      <AlignLeft size={14} />
                      <span>Plain</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCommentContentType("text/markdown")}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-all ${
                        commentContentType === "text/markdown"
                          ? "bg-[var(--primary-violet)]/20 text-[var(--primary-violet)] border border-[var(--primary-violet)]"
                          : "text-text-2 hover:text-text-1 border border-transparent"
                      }`}
                    >
                      <FileText size={14} />
                      <span>Markdown</span>
                    </motion.button>
                  </div>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={
                      commentContentType === "text/markdown"
                        ? "Write a comment in Markdown..."
                        : "Write a comment..."
                    }
                    className="w-full px-4 py-3 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-[var(--primary-violet)] focus:border-transparent transition-all duration-200 resize-none font-mono"
                    rows={3}
                  />
                  {commentContentType === "text/markdown" && (
                    <p className="text-xs text-text-2 mt-1">
                      Supports **bold**, *italic*, [links](url), and more
                    </p>
                  )}
                  <div className="flex justify-end mt-2">
                    <AnimatedButton
                      type="submit"
                      size="sm"
                      variant="primary"
                      loading={isSubmitting}
                      disabled={!commentText.trim()}
                      icon={<Send size={16} />}
                    >
                      Post Comment
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Comments List */}
          <AnimatePresence>
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="mb-4"
              >
                <div className="flex space-x-3">
                  <Avatar
                    imgSrc={
                      isAuthorObject(comment.author)
                        ? comment.author.profileImage ||
                          comment.author.profile_image
                        : undefined
                    }
                    alt={
                      isAuthorObject(comment.author)
                        ? comment.author.displayName ||
                          comment.author.display_name
                        : "Author"
                    }
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="glass-card-subtle rounded-lg p-4 bg-[rgba(var(--glass-rgb),0.3)] backdrop-blur-md">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-text-1">
                            {isAuthorObject(comment.author)
                              ? comment.author.displayName ||
                                comment.author.display_name
                              : "Unknown Author"}
                          </span>
                          <span className="text-sm text-text-2 ml-2">
                            {formatTime(comment.published)}
                          </span>
                        </div>
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="text-sm text-[var(--primary-violet)] hover:underline"
                        >
                          Reply
                        </button>
                      </div>
                      {comment.contentType === "text/markdown" ? (
                        <div
                          className="prose prose-sm max-w-none text-text-1"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(comment.comment),
                          }}
                        />
                      ) : (
                        <p className="text-text-1">{comment.comment}</p>
                      )}

                      {/* Comment Actions */}
                      <div className="flex items-center space-x-4 mt-3">
                        <button
                          onClick={() => handleCommentLike(comment.id)}
                          className="relative overflow-hidden rounded-full px-3 py-1 group transition-all"
                        >
                          {/* Gradient background on hover or when liked */}
                          <motion.div
                            className={`absolute inset-0 transition-opacity ${
                              comment.is_liked
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                            style={{
                              background:
                                "linear-gradient(135deg, var(--primary-pink) 0%, var(--primary-purple) 100%)",
                            }}
                          />
                          <motion.div
                            className={`relative z-10 flex items-center gap-1.5 ${
                              comment.is_liked
                                ? "text-white"
                                : "text-text-2 group-hover:text-white"
                            } transition-colors`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            animate={
                              comment.is_liked
                                ? {
                                    rotate: [0, -20, 20, -10, 10, 0],
                                    scale: [1, 1.2, 1.1, 1.15, 1.05, 1],
                                  }
                                : {}
                            }
                            transition={{ duration: 0.5 }}
                          >
                            <Heart
                              size={16}
                              fill={comment.is_liked ? "currentColor" : "none"}
                            />
                            <span className="text-sm font-medium">
                              {comment.likes_count || 0}
                            </span>
                          </motion.div>
                        </button>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-8 mt-2 space-y-2">
                        {comment.replies.map((reply) => (
                          <motion.div
                            key={reply.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex space-x-3"
                          >
                            <Avatar
                              imgSrc={
                                isAuthorObject(reply.author)
                                  ? reply.author.profileImage ||
                                    reply.author.profile_image
                                  : undefined
                              }
                              alt={
                                isAuthorObject(reply.author)
                                  ? reply.author.displayName ||
                                    reply.author.display_name
                                  : "Author"
                              }
                              size="sm"
                            />
                            <div className="flex-1 glass-card-subtle rounded-lg p-3 bg-[rgba(var(--glass-rgb),0.25)] backdrop-blur-md">
                              <div className="mb-1">
                                <span className="font-medium text-sm text-text-1">
                                  {isAuthorObject(reply.author)
                                    ? reply.author.displayName ||
                                      reply.author.display_name
                                    : "Unknown Author"}
                                </span>
                                <span className="text-xs text-text-2 ml-2">
                                  {formatTime(reply.published)}
                                </span>
                              </div>
                              {reply.contentType === "text/markdown" ? (
                                <div
                                  className="prose prose-sm max-w-none text-text-1 text-sm"
                                  dangerouslySetInnerHTML={{
                                    __html: renderMarkdown(reply.comment),
                                  }}
                                />
                              ) : (
                                <p className="text-sm text-text-1">
                                  {reply.comment}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};

export default PostDetailPage;
