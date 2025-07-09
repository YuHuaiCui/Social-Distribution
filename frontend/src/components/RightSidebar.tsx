import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import type { Author } from '../types/models';
import { api } from '../services/api';
import { useAuth } from './context/AuthContext';
import AnimatedGradient from './ui/AnimatedGradient';

interface RightSidebarProps {
  friends?: Author[];
  trendingTags?: string[];
}

interface UserStats {
  posts: number;
  followers: number;
  following: number;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  friends: propsFriends,
  trendingTags = ['technology', 'design', 'programming', 'webdev', 'opensource'],
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({ posts: 0, followers: 0, following: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [friends, setFriends] = useState<Author[]>(propsFriends || []);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUserStats = useCallback(async () => {
    if (!user?.id) {
      setIsLoadingStats(false);
      return;
    }
    
    try {
      if (!isRefreshing) {
        setIsLoadingStats(true);
      }
      
      // Fetch real stats from the API
      const [followers, following, entries] = await Promise.all([
        api.getFollowers(user.id),
        api.getFollowing(user.id),
        api.getAuthorEntries(user.id)
      ]);
      
      setStats({
        posts: entries.length,
        followers: followers.length,
        following: following.length,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Keep default values on error
    } finally {
      setIsLoadingStats(false);
      setIsRefreshing(false);
    }
  }, [user?.id, isRefreshing]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  // Listen for post creation events to update stats
  useEffect(() => {
    const handlePostCreated = () => {
      // Refresh stats when a new post is created
      fetchUserStats();
    };

    const handleFollowUpdate = () => {
      // Refresh stats when follow status changes
      fetchUserStats();
      // Also refresh friends list
      if (user?.id && !propsFriends) {
        api.getFriends(user.id).then(friendsList => {
          setFriends(friendsList.slice(0, 5));
        }).catch(console.error);
      }
    };

    window.addEventListener('post-created', handlePostCreated);
    window.addEventListener('follow-update', handleFollowUpdate);

    return () => {
      window.removeEventListener('post-created', handlePostCreated);
      window.removeEventListener('follow-update', handleFollowUpdate);
    };
  }, [fetchUserStats, user?.id, propsFriends]);

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user?.id || propsFriends) {
        setIsLoadingFriends(false);
        return;
      }
      
      try {
        setIsLoadingFriends(true);
        const friendsList = await api.getFriends(user.id);
        // Only show online friends (this is a mock - in real app you'd have online status)
        // For now, we'll just show the first 5 friends
        setFriends(friendsList.slice(0, 5));
      } catch (error) {
        console.error('Error fetching friends:', error);
        setFriends([]);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [user?.id, propsFriends]);

  return (
    <aside className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Friends Online */}
        {(friends.length > 0 || isLoadingFriends) && (
          <div className="rounded-2xl border border-border-1 p-4">
            <h3 className="text-[color:var(--text-2)] text-sm font-medium mb-3">
              Friends Online
            </h3>
            {isLoadingFriends ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center p-2 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-[color:var(--glass-rgb)]/20"></div>
                    <div className="ml-3 flex-1">
                      <div className="h-4 bg-[color:var(--glass-rgb)]/20 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-[color:var(--glass-rgb)]/20 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : friends.length === 0 ? (
              <p className="text-xs text-[color:var(--text-2)]">No friends online</p>
            ) : (
              <ul className="space-y-3">
                {friends.map(friend => (
                <li key={friend.id}>
                  <Link 
                    to={`/authors/${friend.id}`}
                    className="flex items-center hover:bg-[color:var(--glass-rgb)]/10 p-2 rounded-lg transition-colors"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[var(--primary-pink)] to-[var(--primary-purple)]">
                        {friend.profile_image ? (
                          <img 
                            src={friend.profile_image} 
                            alt={friend.display_name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-medium">
                            {friend.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[rgb(var(--bg-1))]"></div>
                    </div>
                    <div className="ml-3">
                      <div className="font-medium text-[color:var(--text-1)] text-sm">
                        {friend.display_name}
                      </div>
                      <div className="text-xs text-[color:var(--text-2)]">
                        Online
                      </div>
                    </div>
                  </Link>
                </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Trending Tags */}
        <div className="rounded-2xl border border-border-1 p-4">
          <h3 className="text-[color:var(--text-2)] text-sm font-medium mb-3">
            Trending Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map((tag, index) => {
              const gradientSets = [
                ['var(--primary-yellow)', 'var(--primary-pink)'],
                ['var(--primary-pink)', 'var(--primary-purple)'],
                ['var(--primary-purple)', 'var(--primary-teal)'],
                ['var(--primary-teal)', 'var(--primary-coral)'],
                ['var(--primary-coral)', 'var(--primary-violet)'],
              ];
              
              return (
                <motion.div
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AnimatedGradient
                    gradientColors={gradientSets[index % gradientSets.length]}
                    className="text-xs px-3 py-1.5 rounded-full font-medium shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    duration={20}
                  >
                    #{tag}
                  </AnimatedGradient>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-2xl border border-border-1 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[color:var(--text-2)] text-sm font-medium">
              Your Stats
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsRefreshing(true);
                fetchUserStats();
              }}
              disabled={isLoadingStats || isRefreshing}
              className="text-[color:var(--text-2)] hover:text-[color:var(--text-1)] transition-colors disabled:opacity-50"
              title="Refresh stats"
            >
              <motion.div
                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
              >
                <RefreshCw size={14} />
              </motion.div>
            </motion.button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[color:var(--text-2)]">Posts</span>
              <span className={`text-sm font-medium text-[color:var(--text-1)] transition-opacity ${isLoadingStats && !isRefreshing ? 'opacity-50' : ''}`}>
                {isLoadingStats && !isRefreshing ? '...' : stats.posts}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[color:var(--text-2)]">Followers</span>
              <span className={`text-sm font-medium text-[color:var(--text-1)] transition-opacity ${isLoadingStats && !isRefreshing ? 'opacity-50' : ''}`}>
                {isLoadingStats && !isRefreshing ? '...' : stats.followers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[color:var(--text-2)]">Following</span>
              <span className={`text-sm font-medium text-[color:var(--text-1)] transition-opacity ${isLoadingStats && !isRefreshing ? 'opacity-50' : ''}`}>
                {isLoadingStats && !isRefreshing ? '...' : stats.following}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;