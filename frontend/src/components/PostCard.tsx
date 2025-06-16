import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, Bookmark, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Entry, Author } from '../types/models';
import { api } from '../services/api';
import { useAuth } from './context/AuthContext';
import { useCreatePost } from './context/CreatePostContext';
import { useToast } from './context/ToastContext';
import LoadingImage from './ui/LoadingImage';
import Card from './ui/Card';
import Button from './ui/Button';
import AnimatedGradient from './ui/AnimatedGradient';

interface PostCardProps {
  post: Entry;
  onLike?: (isLiked: boolean) => void;
  onSave?: (isSaved: boolean) => void;
  onDelete?: (postId: string) => void;
  onUpdate?: (post: Entry) => void;
  isLiked?: boolean;
  isSaved?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  onLike, 
  onSave,
  onDelete, 
  isLiked = false, 
  isSaved = false 
}) => {
  const { user } = useAuth();
  const { openCreatePost } = useCreatePost();
  const { showSuccess, showError, showInfo } = useToast();
  const [liked, setLiked] = useState(isLiked);
  const [saved, setSaved] = useState(isSaved);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  
  // Get author info (handle both object and URL reference)
  const author = typeof post.author === 'string' 
    ? { display_name: 'Unknown', id: '' } as Author
    : post.author;

  const date = new Date(post.created_at);
  const timeAgo = getTimeAgo(date);

  const handleLike = async () => {
    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));
    
    try {
      if (newLikedState) {
        await api.likeEntry(post.id);
        showSuccess('Post liked!');
      } else {
        await api.unlikeEntry(post.id);
        showInfo('Post unliked');
      }
      onLike?.(newLikedState);
    } catch (error) {
      // Revert on error
      setLiked(!newLikedState);
      setLikeCount(prev => !newLikedState ? prev + 1 : Math.max(0, prev - 1));
      showError('Failed to update like status');
    }
  };

  const handleSave = () => {
    const newSavedState = !saved;
    setSaved(newSavedState);
    onSave?.(newSavedState);
    
    if (newSavedState) {
      showSuccess('Post saved to your collection');
    } else {
      showInfo('Post removed from collection');
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        showSuccess('Post link copied to clipboard!');
      })
      .catch(() => {
        showError('Failed to copy link');
      });
  };

  const handleEdit = () => {
    console.log("Editing post:", post);
    setShowActions(false);
    openCreatePost(post);
  };

  const handleDelete = async () => {
    setShowActions(false);
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        // Mock API call - replace with actual API
        await api.updateEntry(post.id, { visibility: 'deleted' });
        showSuccess('Post deleted successfully');
        // In real implementation, remove post from UI or refresh
        // Optionally remove from UI
        if (typeof onDelete === "function") {
          onDelete(post.id);
        }
      } catch (error) {
        showError('Failed to delete post');
      }
    }
  };

  // Check if current user is the author
  const isOwnPost = user && author.id === user.id;

  // Handle click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActions]);

  const renderContent = () => {
    if (post.content_type === 'text/markdown') {
      // Simple markdown rendering - in production, use a proper markdown parser
      const htmlContent = post.content
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
    
    return <p className="text-text-1 whitespace-pre-wrap">{post.content}</p>;
  };

  const getVisibilityBadge = () => {
    switch (post.visibility) {
      case 'friends':
        return <span className="text-xs bg-cat-mint px-2 py-0.5 rounded-full">Friends</span>;
      case 'unlisted':
        return <span className="text-xs bg-cat-yellow px-2 py-0.5 rounded-full">Unlisted</span>;
      default:
        return null;
    }
  };

  return (
    <Card variant="main" hoverable className="card-layout">
      <div className="card-content">
        {/* Author info */}
        <div className="flex items-center mb-4">
          <Link 
            to={`/authors/${author.id}`}
            className="flex items-center"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden neumorphism-sm mr-3">
              {author.profile_image ? (
                <LoadingImage
                  src={author.profile_image}
                  alt={author.display_name}
                  className="w-full h-full"
                  loaderSize={14}
                  aspectRatio="1/1"
                  fallback={
                    <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">
                      {author.display_name.charAt(0).toUpperCase()}
                    </div>
                  }
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">
                  {author.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-medium text-text-1">{author.display_name}</h3>
              <div className="flex items-center text-xs text-text-2">
                <span>{timeAgo}</span>
                {getVisibilityBadge() && (
                  <>
                    <span className="mx-1">·</span>
                    {getVisibilityBadge()}
                  </>
                )}
              </div>
            </div>
          </Link>
          
          {isOwnPost && (
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
                    <motion.button
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      onClick={handleEdit}
                      className="w-full px-4 py-2.5 text-left text-text-1 hover:bg-glass-low transition-colors flex items-center space-x-2 cursor-pointer"
                    >
                      <Edit size={16} />
                      <span>Edit Post</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      onClick={handleDelete}
                      className="w-full px-4 py-2.5 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center space-x-2 cursor-pointer"
                    >
                      <Trash2 size={16} />
                      <span>Delete Post</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        
        {/* Post title */}
        <Link to={`/posts/${post.id}`}>
          <h2 className="text-xl font-semibold mb-2 text-text-1 hover:text-brand-500 transition-colors">
            {post.title}
          </h2>
        </Link>
        
        {/* Post content */}
        <div className="mb-4">
          {renderContent()}
        </div>
        
        {/* Post image if it's an image type */}
        {(post.content_type === 'image/png' || post.content_type === 'image/jpeg') && post.image && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <LoadingImage
              src={post.image}
              alt="Post attachment"
              className="w-full h-auto max-h-96 object-cover"
              loaderSize={24}
            />
          </div>
        )}
        
        {/* Categories */}
        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.categories.map((category, index) => {
              const gradientSets = [
                ['var(--primary-yellow)', 'var(--primary-pink)'],
                ['var(--primary-pink)', 'var(--primary-purple)'],
                ['var(--primary-purple)', 'var(--primary-teal)'],
                ['var(--primary-teal)', 'var(--primary-coral)'],
                ['var(--primary-coral)', 'var(--primary-violet)'],
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
        <div className="flex items-stretch divide-x divide-border-1">
          {/* Like Button */}
          <button
            onClick={handleLike}
            className="flex-1 flex items-center justify-center py-3 relative overflow-hidden group transition-all"
            aria-label={liked ? "Unlike this post" : "Like this post"}
          >
            {/* Gradient background on hover or when liked */}
            <motion.div
              className={`absolute inset-0 transition-opacity ${liked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              style={{
                background: 'linear-gradient(135deg, var(--primary-pink) 0%, var(--primary-purple) 100%)',
              }}
            />
            <motion.div
              className={`relative z-10 flex items-center gap-2 ${liked ? 'text-white' : 'text-text-2 group-hover:text-white'} transition-colors`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              animate={liked ? {
                rotate: [0, -20, 20, -10, 10, 0],
                scale: [1, 1.2, 1.1, 1.15, 1.05, 1],
              } : {}}
              transition={{ duration: 0.5 }}
            >
              <ThumbsUp size={18} fill={liked ? 'currentColor' : 'none'} />
              <span className="text-sm font-medium">{likeCount}</span>
            </motion.div>
          </button>
          
          {/* Comment Button */}
          <Link to={`/posts/${post.id}`} className="flex-1">
            <button
              className="w-full h-full flex items-center justify-center py-3 relative overflow-hidden group transition-all"
              aria-label="View comments"
            >
              {/* Gradient background on hover */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-blue) 100%)',
                }}
              />
              <motion.div 
                className="relative z-10 flex items-center gap-2 text-text-2 group-hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <MessageCircle size={18} />
                <span className="text-sm font-medium">{post.comments_count || 0}</span>
              </motion.div>
            </button>
          </Link>
          
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center py-3 relative overflow-hidden group transition-all"
            aria-label="Share this post"
          >
            {/* Gradient background on hover */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, var(--primary-yellow) 0%, var(--primary-coral) 100%)',
              }}
            />
            <motion.div 
              className="relative z-10 flex items-center gap-2 text-text-2 group-hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 size={18} />
              <span className="text-sm font-medium">Share</span>
            </motion.div>
          </button>
          
          {/* Save Button */}
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center py-3 relative overflow-hidden group transition-all"
            aria-label={saved ? "Unsave this post" : "Save this post"}
          >
            {/* Gradient background on hover or when saved */}
            <motion.div
              className={`absolute inset-0 transition-opacity ${saved ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              style={{
                background: 'linear-gradient(135deg, var(--primary-violet) 0%, var(--primary-purple) 100%)',
              }}
            />
            <motion.div
              className={`relative z-10 flex items-center gap-2 ${saved ? 'text-white' : 'text-text-2 group-hover:text-white'} transition-colors`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              animate={saved ? {
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              } : {}}
              transition={{ duration: 0.3 }}
            >
              <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
              <span className="text-sm font-medium">Save</span>
            </motion.div>
          </button>
        </div>
      </div>
    </Card>
  );
};

// Helper function to format dates
function getTimeAgo(date: Date): string {
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) {
    return 'just now';
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (secondsAgo < 86400) {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (secondsAgo < 604800) {
    const days = Math.floor(secondsAgo / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export default PostCard;