import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark, 
  MoreVertical, Edit, Trash2, Send, Clock, Hash 
} from 'lucide-react';
import { useAuth } from '../components/context/AuthContext';
import type { Entry, Comment, Author } from '../types/models';
import AnimatedButton from '../components/ui/AnimatedButton';
import Card from '../components/ui/Card';
import Avatar from '../components/Avatar/Avatar';
import Loader from '../components/ui/Loader';

interface CommentWithReplies extends Comment {
  replies?: Comment[];
}

export const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Entry | null>(null);
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Type guard to check if author is an Author object
  const isAuthorObject = (author: any): author is Author => {
    return author && typeof author === 'object' && 'id' in author;
  };

  useEffect(() => {
    fetchPostDetails();
  }, [postId]);

  const fetchPostDetails = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with API call
      const mockPost: Entry = {
        id: postId!,
        url: `http://localhost:8000/api/entries/${postId}/`,
        author: {
          id: '123',
          url: 'http://localhost:8000/api/authors/123/',
          username: 'johndoe',
          email: 'john@example.com',
          display_name: 'John Doe',
          profile_image: 'https://i.pravatar.cc/150?u=john',
          bio: 'Full-stack developer passionate about creating amazing user experiences',
          is_approved: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        title: 'Building a Modern Social Network with React and Django',
        content: `# Building a Modern Social Network

In this comprehensive guide, we'll explore how to build a modern social network application using React for the frontend and Django for the backend.

## Key Features

- **Real-time updates**: Keep users engaged with live notifications
- **Responsive design**: Works seamlessly across all devices
- **Federation support**: Connect with other social networks
- **Rich media**: Support for images, videos, and markdown

## Architecture Overview

The application follows a microservices architecture with:

1. **Frontend**: React with TypeScript
2. **Backend**: Django REST Framework
3. **Database**: PostgreSQL
4. **Cache**: Redis
5. **Message Queue**: RabbitMQ

Let's dive into each component...`,
        content_type: 'text/markdown' as const,
        visibility: 'public' as const,
        categories: ['web-development', 'tutorial', 'react', 'django'],
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        likes_count: 42,
        comments_count: 8,
      };

      const mockComments: CommentWithReplies[] = [
        {
          id: '1',
          url: 'http://localhost:8000/api/comments/1/',
          author: {
            id: '124',
            url: 'http://localhost:8000/api/authors/124/',
            username: 'alice',
            email: 'alice@example.com',
            display_name: 'Alice Chen',
            profile_image: 'https://i.pravatar.cc/150?u=alice',
            is_approved: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          content: 'This is an excellent guide! I especially appreciate the architecture overview. Would you consider adding a section on authentication strategies?',
          content_type: 'text/plain' as const,
          entry: postId!,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          replies: [
            {
              id: '2',
              url: 'http://localhost:8000/api/comments/2/',
              author: mockPost.author,
              content: "Great suggestion! I'll add a section on JWT authentication and OAuth integration in the next update.",
              content_type: 'text/plain' as const,
              entry: postId!,
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
              updated_at: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
            },
          ],
        },
        {
          id: '3',
          url: 'http://localhost:8000/api/comments/3/',
          author: {
            id: '125',
            url: 'http://localhost:8000/api/authors/125/',
            username: 'bob',
            email: 'bob@example.com',
            display_name: 'Bob Wilson',
            is_approved: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          content: 'How do you handle real-time updates? Are you using WebSockets or Server-Sent Events?',
          content_type: 'text/plain' as const,
          entry: postId!,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        },
      ];

      setPost(mockPost);
      setComments(mockComments);
      setIsLiked(Math.random() > 0.5);
      setIsBookmarked(Math.random() > 0.7);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    
    // Optimistic update
    if (post) {
      setPost({
        ...post,
        likes_count: newLikedState ? (post.likes_count || 0) + 1 : (post.likes_count || 0) - 1,
      });
    }
    
    try {
      // API call would go here
    } catch (error) {
      // Revert on error
      setIsLiked(!newLikedState);
      if (post) {
        setPost({
          ...post,
          likes_count: newLikedState ? (post.likes_count || 0) - 1 : (post.likes_count || 0) + 1,
        });
      }
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      // API call would go here
      const newComment: CommentWithReplies = {
        id: Date.now().toString(),
        url: `http://localhost:8000/api/comments/${Date.now()}/`,
        author: user!,
        content: commentText,
        content_type: 'text/plain' as const,
        entry: postId!,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (replyingTo) {
        // Add as reply
        setComments(prev => 
          prev.map(comment => 
            comment.id === replyingTo
              ? { ...comment, replies: [...(comment.replies || []), newComment] }
              : comment
          )
        );
      } else {
        // Add as new comment
        setComments(prev => [newComment, ...prev]);
      }
      
      setCommentText('');
      setReplyingTo(null);
      
      if (post) {
        setPost({ ...post, comments_count: (post.comments_count || 0) + 1 });
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
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
    if (contentType === 'text/markdown') {
      // Simple markdown rendering
      const htmlContent = content
        .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3 mt-6">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mb-2 mt-4">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[var(--primary-violet)] hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/^- (.*$)/gim, '<li class="ml-6 list-disc">$1</li>')
        .replace(/^\d+\. (.*$)/gim, '<li class="ml-6 list-decimal">$1</li>')
        .replace(/\n\n/g, '</p><p class="mb-4">')
        .replace(/\n/g, '<br>');
      
      return (
        <div 
          className="prose prose-lg max-w-none text-text-1"
          dangerouslySetInnerHTML={{ __html: `<p class="mb-4">${htmlContent}</p>` }}
        />
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
          <h2 className="text-xl font-semibold text-text-1 mb-2">Post not found</h2>
          <p className="text-text-2 mb-4">The post you're looking for doesn't exist.</p>
          <AnimatedButton onClick={() => navigate('/')} variant="primary">
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
        <Card variant="prominent" className="p-6 md:p-8 mb-6">
          {/* Author Info */}
          <div className="flex items-center space-x-3 mb-6">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Avatar
                imgSrc={isAuthorObject(post.author) ? post.author.profile_image : undefined}
                alt={isAuthorObject(post.author) ? post.author.display_name : 'Author'}
                size="lg"
              />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-1">
                {isAuthorObject(post.author) ? post.author.display_name : 'Unknown Author'}
              </h3>
              <div className="flex items-center space-x-3 text-sm text-text-2">
                <span>@{isAuthorObject(post.author) ? post.author.username : 'unknown'}</span>
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
                  isLiked ? 'text-[var(--primary-pink)]' : 'text-text-2 hover:text-text-1'
                } transition-colors`}
              >
                <motion.div
                  animate={isLiked ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                </motion.div>
                <span className="text-sm font-medium">{post.likes_count || 0}</span>
              </motion.button>

              <div className="flex items-center space-x-2 text-text-2">
                <MessageCircle size={20} />
                <span className="text-sm font-medium">{post.comments_count || 0}</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
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
                isBookmarked ? 'text-[var(--primary-teal)]' : 'text-text-2 hover:text-text-1'
              } transition-colors`}
            >
              <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
            </motion.button>
          </div>
        </Card>

        {/* Comments Section */}
        <Card variant="main" className="p-6">
          <h2 className="text-xl font-semibold text-text-1 mb-6">
            Comments ({comments.length})
          </h2>

          {/* Comment Form */}
          <form onSubmit={handleSubmitComment} className="mb-6">
            {replyingTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
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
                alt={user?.display_name || 'User'}
                size="md"
              />
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full px-4 py-3 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-[var(--primary-violet)] focus:border-transparent transition-all duration-200 resize-none"
                  rows={3}
                />
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
                    imgSrc={isAuthorObject(comment.author) ? comment.author.profile_image : undefined}
                    alt={isAuthorObject(comment.author) ? comment.author.display_name : 'Author'}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="glass-card-subtle rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-text-1">
                            {isAuthorObject(comment.author) ? comment.author.display_name : 'Unknown Author'}
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
                      <p className="text-text-1">{comment.content}</p>
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
                              imgSrc={isAuthorObject(reply.author) ? reply.author.profile_image : undefined}
                              alt={isAuthorObject(reply.author) ? reply.author.display_name : 'Author'}
                              size="sm"
                            />
                            <div className="flex-1 glass-card-subtle rounded-lg p-3">
                              <div className="mb-1">
                                <span className="font-medium text-sm text-text-1">
                                  {isAuthorObject(reply.author) ? reply.author.display_name : 'Unknown Author'}
                                </span>
                                <span className="text-xs text-text-2 ml-2">
                                  {formatTime(reply.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-text-1">{reply.content}</p>
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