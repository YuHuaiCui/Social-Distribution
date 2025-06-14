import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Hash, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import AnimatedButton from '../ui/AnimatedButton';

interface TrendingTopic {
  tag: string;
  count: number;
}

interface SuggestedUser {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar?: string;
}

export const RightSidebar: React.FC = () => {
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);

  useEffect(() => {
    // Mock data - replace with actual API calls
    setTrending([
      { tag: 'distributed', count: 1234 },
      { tag: 'social', count: 987 },
      { tag: 'cmput404', count: 654 },
      { tag: 'coding', count: 543 },
      { tag: 'opensource', count: 321 },
    ]);

    setSuggestedUsers([
      { id: '1', username: 'alice', display_name: 'Alice Wonder', bio: 'Building cool stuff' },
      { id: '2', username: 'bob', display_name: 'Bob Builder', bio: 'Can we fix it?' },
      { id: '3', username: 'charlie', display_name: 'Charlie Dev', bio: 'Full stack developer' },
    ]);
  }, []);

  return (
    <aside className="sticky top-0 h-screen w-80 p-4 space-y-6 overflow-y-auto">
      {/* Trending Topics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--card-bg)] backdrop-blur-sm rounded-xl p-4 border border-gray-800/50"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-purple-400" />
          <h3 className="font-semibold text-white">Trending Topics</h3>
        </div>
        
        <div className="space-y-2">
          {trending.map((topic, index) => (
            <motion.div
              key={topic.tag}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/search?q=%23${topic.tag}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Hash size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-300">{topic.tag}</span>
                </div>
                <span className="text-xs text-gray-500">{topic.count} posts</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Suggested Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[var(--card-bg)] backdrop-blur-sm rounded-xl p-4 border border-gray-800/50"
      >
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-pink-400" />
          <h3 className="font-semibold text-white">Who to Follow</h3>
        </div>
        
        <div className="space-y-3">
          {suggestedUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
              className="flex items-start justify-between"
            >
              <Link to={`/profile/${user.username}`} className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {user.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white hover:underline">
                    {user.display_name}
                  </p>
                  <p className="text-xs text-gray-400">@{user.username}</p>
                  {user.bio && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{user.bio}</p>
                  )}
                </div>
              </Link>
              <AnimatedButton
                variant="secondary"
                size="sm"
                className="ml-2"
              >
                <Plus size={14} />
                Follow
              </AnimatedButton>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex flex-wrap gap-2">
          <Link to="/about" className="hover:underline">About</Link>
          <Link to="/help" className="hover:underline">Help</Link>
          <Link to="/terms" className="hover:underline">Terms</Link>
          <Link to="/privacy" className="hover:underline">Privacy</Link>
        </div>
        <p>© 2025 Distributed Social</p>
      </div>
    </aside>
  );
};