import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, Bookmark } from 'lucide-react';
import type { Entry, Author } from '../types/models';
import { api } from '../services/api';
import { useToast } from './context/ToastContext';
import LoadingImage from './ui/LoadingImage';
import Card from './ui/Card';
import Button from './ui/Button';

interface PostCardProps {
  post: Entry;
  onLike?: (isLiked: boolean) => void;
  onSave?: (isSaved: boolean) => void;
  isLiked?: boolean;
  isSaved?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  onLike, 
  onSave, 
  isLiked = false, 
  isSaved = false 
}) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [liked, setLiked] = useState(isLiked);
  const [saved, setSaved] = useState(isSaved);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  
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
      .catch(err => {
        showError('Failed to copy link');
      });
  };

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
          
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto p-1"
            aria-label="Post options"
          >
            <MoreHorizontal size={18} />
          </Button>
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
            {post.categories.map((category, index) => (
              <Link
                key={index}
                to={`/search?category=${encodeURIComponent(category)}`}
                className="px-3 py-1 rounded-full bg-cat-lilac text-text-1 text-sm hover:opacity-80 transition-opacity"
              >
                #{category}
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* Post stats and interaction buttons */}
      <div className="card-footer flex items-center justify-between border-t border-border-1 pt-3">
        <div className="flex space-x-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`${liked ? 'text-brand-500' : 'text-text-2'} hover:text-brand-500`}
            aria-label={liked ? "Unlike this post" : "Like this post"}
          >
            <ThumbsUp size={18} className="mr-1.5" fill={liked ? 'currentColor' : 'none'} />
            <span className="text-sm">{likeCount}</span>
          </Button>
          
          <Link to={`/posts/${post.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-text-2 hover:text-brand-500"
              aria-label="View comments"
            >
              <MessageCircle size={18} className="mr-1.5" />
              <span className="text-sm">{post.comments_count || 0}</span>
            </Button>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="text-text-2 hover:text-brand-500"
            aria-label="Share this post"
          >
            <Share2 size={18} className="mr-1.5" />
            <span className="text-sm">Share</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className={`${saved ? 'text-brand-500' : 'text-text-2'} hover:text-brand-500`}
            aria-label={saved ? "Unsave this post" : "Save this post"}
          >
            <Bookmark size={18} className="mr-1.5" fill={saved ? 'currentColor' : 'none'} />
            <span className="text-sm">Save</span>
          </Button>
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