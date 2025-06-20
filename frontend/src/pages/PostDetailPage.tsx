import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
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
import { triggerNotificationUpdate } from "../components/context/NotificationContext";
import type { Entry, Comment, Author } from "../types/models";
import AnimatedButton from "../components/ui/AnimatedButton";
import Card from "../components/ui/Card";
import Avatar from "../components/Avatar/Avatar";
import Loader from "../components/ui/Loader";
import { entryService } from "../services/entry";
import { socialService } from "../services/social";
import { renderMarkdown } from "../utils/markdown";
import { extractUUID } from "../utils/extractId";

interface CommentWithReplies extends Comment {
  replies?: Comment[];
}

export const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError } = useToast();
  const [post, setPost] = useState<Entry | null>(null);
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentContentType, setCommentContentType] = useState<"text/plain" | "text/markdown">("text/plain");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  // Type guard to check if author is an Author object
  const isAuthorObject = (author: unknown): author is Author => {
    return (
      author !== null &&
      typeof author === "object" &&
      "id" in (author as Record<string, unknown>)
    );
  };
  const fetchPostDetails = useCallback(async () => {
    if (!postId) return;

    setIsLoading(true);

    // Extract UUID if postId is a full URL
    let extractedId = postId;
    if (postId.includes('/')) {
      // Extract the UUID from the URL (last segment)
      const segments = postId.split('/');
      extractedId = segments[segments.length - 1] || segments[segments.length - 2];
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(extractedId)) {
      console.warn(`Invalid UUID format for postId: ${extractedId} (original: ${postId})`);
      setPost(null);
      setIsLoading(false);
      return;
    }
    
    // Use the extracted UUID for all API calls
    const validPostId = extractedId;
    
    // Fetch the post details
    let fetchedPost;
    try {
      fetchedPost = await entryService.getEntry(validPostId);
      setPost(fetchedPost);
    } catch (error) {
      // Check if it's a 404 error - could be the post doesn't exist or is not viewable due to permissions
      console.error("Error fetching post:", error);

      // Update the API endpoint in PostDetailPage to use the author's specific entries endpoint
      // if the direct entry endpoint returns a 404
      if (user?.id) {
        try {
          console.log("Trying to fetch post using author endpoint");
          // Try fetching through author's endpoint which might have different permissions
          const response = await entryService.getEntriesByAuthor(user.id);
          const authorPost = response.results.find(
            (entry) => entry.id === validPostId
          );

          if (authorPost) {
            console.log("Found post via author endpoint");
            setPost(authorPost);
            setIsLoading(false);
            return;
          }
        } catch (authorError) {
          console.error(
            "Also failed to fetch via author endpoint:",
            authorError
          );
        }
      }

      // Set post to null and exit early
      setPost(null);
      setIsLoading(false);
      return; // Exit early if we can't get the post
    }

    // Fetch comments for the post
    try {
      const commentsResponse = await entryService.getComments(validPostId);

      // Convert flat comments to threaded structure
      const parentComments: CommentWithReplies[] = [];
      const commentReplies: Record<string, Comment[]> = {};

      // First pass: separate parent comments and replies
      commentsResponse.results.forEach((comment) => {
        if (comment.parent) {
          // This is a reply
          const parentId =
            typeof comment.parent === "string"
              ? comment.parent
              : comment.parent.id;

          if (!commentReplies[parentId]) {
            commentReplies[parentId] = [];
          }
          commentReplies[parentId].push(comment);
        } else {
          // This is a parent comment
          parentComments.push({ ...comment, replies: [] });
        }
      });

      // Second pass: add replies to their parent comments
      parentComments.forEach((comment) => {
        if (commentReplies[comment.id]) {
          comment.replies = commentReplies[comment.id];
        }
      });

      setComments(parentComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      // Continue with other operations even if comments fail
    }

    // Get like status using the API
    try {
      const response = await fetch(`/api/entries/${validPostId}/likes/`);
      if (response.ok) {
        const likeData = await response.json();
        setIsLiked(likeData.liked_by_current_user);
      } else {
        // If the API call fails, use the is_liked property from the post
        setIsLiked(fetchedPost.is_liked || false);
      }
    } catch (error) {
      console.error("Error fetching like status:", error);
      // Fallback to post data
      setIsLiked(fetchedPost.is_liked || false);
    }

    // Get bookmarked/saved status
    try {
      const savedPostsResponse = await socialService.getSavedPosts();
      const isSaved = savedPostsResponse.results.some(
        (savedPost) => savedPost.id === validPostId
      );
      setIsBookmarked(isSaved);
    } catch (error) {
      console.error("Error checking saved status:", error);
      setIsBookmarked(false);
    }

    // Always set loading to false at the end
    setIsLoading(false);
  }, [postId, user?.id]);

  useEffect(() => {
    fetchPostDetails();
  }, [fetchPostDetails]);

  const handleLike = async () => {
    if (!postId || !post) return;

    // Extract UUID from postId if it's a URL
    const extractedId = extractUUID(postId);

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
  const handleBookmark = async () => {
    if (!postId) return;

    // Extract UUID from postId if it's a URL
    const extractedId = extractUUID(postId);

    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState);

    try {
      // Make the actual API call
      if (newBookmarkState) {
        await socialService.savePost(extractedId);
      } else {
        await socialService.unsavePost(extractedId);
      }
    } catch (err) {
      console.error("Error updating bookmark status:", err);
      // Revert on error
      setIsBookmarked(!newBookmarkState);
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
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        // You might want to show a toast notification here
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !postId) return;

    // Extract UUID from postId if it's a URL
    let extractedId = postId;
    if (postId.includes('/')) {
      const segments = postId.split('/');
      extractedId = segments[segments.length - 1] || segments[segments.length - 2];
    }

    console.log("Submitting comment for post ID:", extractedId, "(original:", postId, ")");
    console.log("Current user:", user);
    console.log("Session cookie:", document.cookie);

    setIsSubmitting(true);
    try {
      // Create the comment data with the correct type format
      const commentData = {
        content: commentText,
        content_type: commentContentType,
      };

      // If replying to another comment, add it as parent
      if (replyingTo) {
        // In a real implementation this would include parent reference
        // For now we'll submit it as a regular comment
        const newComment = await entryService.createComment(
          extractedId,
          commentData
        );

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
        // Create a new top-level comment
        const newComment = await entryService.createComment(
          extractedId,
          commentData
        );

        // Add to the comments list
        setComments((prev) => [newComment as CommentWithReplies, ...prev]);
      }

      // Reset the form
      setCommentText("");
      setReplyingTo(null);

      // Update the comment count
      if (post) {
        const newCommentCount = (post.comments_count || 0) + 1;
        setPost({ ...post, comments_count: newCommentCount });
        
        // Dispatch custom event to update comment count in other components
        window.dispatchEvent(new CustomEvent('post-update', {
          detail: { postId: post.id, updates: { comments_count: newCommentCount } }
        }));
        
        // Trigger notification update in case the post author receives a notification
        triggerNotificationUpdate();
      }
    } catch (err) {
      console.error("Error submitting comment:", err);

      // Provide detailed error logging to help troubleshooting
      if (err instanceof Error) {
        console.error("Error message:", err.message);
      }

      // Log request data for debugging
      console.log("Comment request data:", {
        postId,
        commentData: {
          content: commentText,
          content_type: commentContentType,
        },
      });

      // Show user-friendly error message
      showError("Failed to submit comment. Please try again.");
    } finally {
      setIsSubmitting(false);
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

    // For image posts, display the image and caption
    if (contentType === "image/png" || contentType === "image/jpeg") {
      return (
        <div className="space-y-4">
          {post.image && (
            <div className="rounded-lg overflow-hidden">
              <img 
                src={post.image} 
                alt={post.title}
                className="w-full h-auto max-h-[600px] object-contain bg-glass-low"
              />
            </div>
          )}
          {content && content !== "Image post" && (
            <p className="text-text-1 text-center italic">{content}</p>
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

        {isAuthorObject(post.author) && post.author.id === user?.id && (
          <div className="relative">
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
                  className="absolute right-0 mt-2 w-48 glass-card-prominent rounded-lg shadow-lg overflow-hidden"
                >
                  <button className="w-full px-4 py-2 text-left text-text-1 hover:bg-glass-low transition-colors flex items-center space-x-2">
                    <Edit size={16} />
                    <span>Edit Post</span>
                  </button>
                  <button className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center space-x-2">
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
                    ? post.author.profile_image
                    : undefined
                }
                alt={
                  isAuthorObject(post.author)
                    ? post.author.display_name
                    : "Author"
                }
                size="lg"
              />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-1">
                {isAuthorObject(post.author)
                  ? post.author.display_name
                  : "Unknown Author"}
              </h3>
              <div className="flex items-center space-x-3 text-sm text-text-2">
                <span>
                  @
                  {isAuthorObject(post.author)
                    ? post.author.username
                    : "unknown"}
                </span>
                <span>•</span>
                <span className="flex items-center">
                  <Clock size={14} className="mr-1" />
                  {formatDate(post.created_at)}
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
            {renderContent(post.content, post.content_type)}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-border-1">
            <div className="flex items-center space-x-4">
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

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleBookmark}
              className={`${
                isBookmarked
                  ? "text-[var(--primary-teal)]"
                  : "text-text-2 hover:text-text-1"
              } transition-colors`}
            >
              <Bookmark
                size={20}
                fill={isBookmarked ? "currentColor" : "none"}
              />
            </motion.button>
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

          {/* Comment Form */}
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
                imgSrc={user?.profile_image}
                alt={user?.display_name || "User"}
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
                  placeholder={commentContentType === "text/markdown" ? "Write a comment in Markdown..." : "Write a comment..."}
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
                        ? comment.author.profile_image
                        : undefined
                    }
                    alt={
                      isAuthorObject(comment.author)
                        ? comment.author.display_name
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
                              ? comment.author.display_name
                              : "Unknown Author"}
                          </span>
                          <span className="text-sm text-text-2 ml-2">
                            {formatTime(comment.created_at)}
                          </span>
                        </div>
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="text-sm text-[var(--primary-violet)] hover:underline"
                        >
                          Reply
                        </button>
                      </div>
                      {comment.content_type === "text/markdown" ? (
                        <div
                          className="prose prose-sm max-w-none text-text-1"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.content) }}
                        />
                      ) : (
                        <p className="text-text-1">{comment.content}</p>
                      )}
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
                                  ? reply.author.profile_image
                                  : undefined
                              }
                              alt={
                                isAuthorObject(reply.author)
                                  ? reply.author.display_name
                                  : "Author"
                              }
                              size="sm"
                            />
                            <div className="flex-1 glass-card-subtle rounded-lg p-3 bg-[rgba(var(--glass-rgb),0.25)] backdrop-blur-md">
                              <div className="mb-1">
                                <span className="font-medium text-sm text-text-1">
                                  {isAuthorObject(reply.author)
                                    ? reply.author.display_name
                                    : "Unknown Author"}
                                </span>
                                <span className="text-xs text-text-2 ml-2">
                                  {formatTime(reply.created_at)}
                                </span>
                              </div>
                              {reply.content_type === "text/markdown" ? (
                                <div
                                  className="prose prose-sm max-w-none text-text-1 text-sm"
                                  dangerouslySetInnerHTML={{ __html: renderMarkdown(reply.content) }}
                                />
                              ) : (
                                <p className="text-sm text-text-1">
                                  {reply.content}
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
