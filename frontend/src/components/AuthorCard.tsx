import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  UserPlus, UserMinus, Users, FileText, 
  MapPin, Link as LinkIcon, Calendar,
  MoreVertical, Mail, Ban, Flag
} from 'lucide-react';
import type { Author } from '../types/models';
import Avatar from './Avatar/Avatar';
import AnimatedButton from './ui/AnimatedButton';
import Card from './ui/Card';
import { api } from '../services/api';
import { useAuth } from './context/AuthContext';

interface AuthorCardProps {
  author: Author & {
    follower_count?: number;
    following_count?: number;
    post_count?: number;
    is_following?: boolean;
    is_followed_by?: boolean;
    location?: string;
    website?: string;
  };
  variant?: 'default' | 'compact' | 'detailed';
  showStats?: boolean;
  showBio?: boolean;
  showActions?: boolean;
  onFollow?: (isFollowing: boolean) => void;
  className?: string;
}

export const AuthorCard: React.FC<AuthorCardProps> = ({
  author,
  variant = 'default',
  showStats = true,
  showBio = true,
  showActions = true,
  onFollow,
  className = '',
}) => {
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(author.is_following || false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [followerCount, setFollowerCount] = useState(author.follower_count || 0);
  const [followingCount, setFollowingCount] = useState(author.following_count || 0);
  const [statsLoading, setStatsLoading] = useState(false);

  // Check if the current user is viewing their own profile
  const isOwnProfile = currentUser && currentUser.id === author.id;

  // Sync local follow state with prop changes
  useEffect(() => {
    setIsFollowing(author.is_following || false);
  }, [author.is_following]);

  // Fetch real follower/following counts from backend
  useEffect(() => {
    const fetchStats = async () => {
      if (!showStats) return;
      
      setStatsLoading(true);
      try {
        const [followers, following] = await Promise.all([
          api.getFollowers(author.id),
          api.getFollowing(author.id),
        ]);
        
        setFollowerCount(followers.length);
        setFollowingCount(following.length);
      } catch (error) {
        console.error('Error fetching author stats:', error);
        // Fall back to provided counts or 0
        setFollowerCount(author.follower_count || 0);
        setFollowingCount(author.following_count || 0);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [author.id, showStats, author.follower_count, author.following_count]);

  const handleFollow = async () => {
    setIsLoading(true);
    const newFollowState = !isFollowing;
    
    try {
      if (newFollowState) {
        await api.followAuthor(author.id);
        // Optimistically update follower count (will be pending approval)
        // Note: In reality, this might not increase the count until approved
      } else {
        await api.unfollowAuthor(author.id);
        // Decrease follower count immediately
        setFollowerCount(prev => Math.max(0, prev - 1));
      }
      
      setIsFollowing(newFollowState);
      onFollow?.(newFollowState);
    } catch (error) {
      console.error('Error following/unfollowing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long',
    });
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`flex items-center space-x-3 p-3 rounded-lg glass-card-subtle bg-[rgba(var(--glass-rgb),0.85)] backdrop-blur-md hover:bg-glass-low transition-all ${className}`}
      >
        <Link to={`/authors/${author.id}`}>
          <Avatar
            imgSrc={author.profile_image}
            alt={author.display_name}
            size="md"
          />
        </Link>
        
        <div className="flex-1 min-w-0">
          <Link to={`/authors/${author.id}`} className="hover:underline">
            <h4 className="font-medium text-text-1 truncate">{author.display_name}</h4>
          </Link>
          <p className="text-sm text-text-2 truncate">@{author.username}</p>
        </div>
        
        {showActions && !isOwnProfile && (
          <AnimatedButton
            size="sm"
            variant={isFollowing ? 'secondary' : 'primary'}
            onClick={handleFollow}
            loading={isLoading}
          >
            {isFollowing ? 'Followed' : 'Follow'}
          </AnimatedButton>
        )}
      </motion.div>
    );
  }

  return (
    <Card variant="main" hoverable className={`bg-[rgba(var(--glass-rgb),0.85)] backdrop-blur-md ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <Link to={`/authors/${author.id}`} className="flex items-center space-x-4">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Avatar
                imgSrc={author.profile_image}
                alt={author.display_name}
                size={variant === 'detailed' ? 'xl' : 'lg'}
              />
            </motion.div>
            
            <div>
              <h3 className="text-lg font-semibold text-text-1 hover:underline">
                {author.display_name}
              </h3>
              <p className="text-text-2">@{author.username}</p>
              
              {author.is_followed_by && (
                <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs bg-glass-low text-text-2">
                  Follows you
                </span>
              )}
            </div>
          </Link>
          
          {showActions && (
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-glass-low transition-colors"
              >
                <MoreVertical size={18} className="text-text-2" />
              </motion.button>
              
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 mt-2 w-48 glass-card-prominent rounded-lg shadow-lg overflow-hidden z-10"
                >
                  <button className="w-full px-4 py-2 text-left text-text-1 hover:bg-glass-low transition-colors flex items-center space-x-2">
                    <Mail size={16} />
                    <span>Send Message</span>
                  </button>
                  <button className="w-full px-4 py-2 text-left text-text-1 hover:bg-glass-low transition-colors flex items-center space-x-2">
                    <Ban size={16} />
                    <span>Block User</span>
                  </button>
                  <button className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center space-x-2">
                    <Flag size={16} />
                    <span>Report</span>
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
        
        {/* Bio */}
        {showBio && author.bio && (
          <p className="text-text-1 mb-4 line-clamp-3">{author.bio}</p>
        )}
        
        {/* Stats */}
        {showStats && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm">
            <div className="flex items-center space-x-1 min-w-0">
              <FileText size={16} className="text-text-2 flex-shrink-0" />
              <span className="font-semibold text-text-1">
                {formatCount(author.post_count || 0)}
              </span>
              <span className="text-text-2">posts</span>
            </div>
            
            <Link to={`/authors/${author.id}/followers`} className="flex items-center space-x-1 hover:underline min-w-0">
              <Users size={16} className="text-text-2 flex-shrink-0" />
              <span className={`font-semibold text-text-1 ${statsLoading ? 'opacity-50' : ''}`}>
                {formatCount(followerCount)}
              </span>
              <span className="text-text-2">followers</span>
            </Link>
            
            <Link to={`/authors/${author.id}/following`} className="flex items-center space-x-1 hover:underline min-w-0">
              <span className={`font-semibold text-text-1 ${statsLoading ? 'opacity-50' : ''}`}>
                {formatCount(followingCount)}
              </span>
              <span className="text-text-2">following</span>
            </Link>
          </div>
        )}
        
        {/* Additional Info (detailed variant) */}
        {variant === 'detailed' && (
          <div className="space-y-2 mb-4 text-sm text-text-2">
            {author.location && (
              <div className="flex items-center space-x-2">
                <MapPin size={16} />
                <span>{author.location}</span>
              </div>
            )}
            
            {author.website && (
              <div className="flex items-center space-x-2">
                <LinkIcon size={16} />
                <a 
                  href={author.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[var(--primary-violet)] hover:underline"
                >
                  {author.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Calendar size={16} />
              <span>Joined {formatDate(author.created_at)}</span>
            </div>
          </div>
        )}
        
        {/* Follow Button */}
        {showActions && !isOwnProfile && (
          <AnimatedButton
            variant={isFollowing ? 'secondary' : 'primary'}
            onClick={handleFollow}
            loading={isLoading}
            icon={isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
            className="w-full"
          >
            {isFollowing ? 'Followed' : 'Follow'}
          </AnimatedButton>
        )}
      </div>
    </Card>
  );
};

// Grid variant for displaying multiple authors
interface AuthorGridProps {
  authors: AuthorCardProps['author'][];
  columns?: 1 | 2 | 3 | 4;
  variant?: AuthorCardProps['variant'];
  className?: string;
}

export const AuthorGrid: React.FC<AuthorGridProps> = ({
  authors,
  columns = 3,
  variant = 'default',
  className = '',
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {authors.map((author, index) => (
        <motion.div
          key={author.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <AuthorCard author={author} variant={variant} />
        </motion.div>
      ))}
    </div>
  );
};

export default AuthorCard;