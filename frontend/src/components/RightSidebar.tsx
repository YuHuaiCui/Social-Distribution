import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Author } from '../types/models';

interface RightSidebarProps {
  friends?: Author[];
  trendingTags?: string[];
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  friends = [],
  trendingTags = ['cmput404', 'distributedsystems', 'programming', 'react', 'typescript'],
}) => {
  return (
    <aside className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Friends Online */}
        {friends.length > 0 && (
          <div className="bg-[rgba(var(--glass-rgb),var(--glass-alpha-low))] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] p-4">
            <h3 className="text-[color:var(--text-2)] text-sm font-medium mb-3">
              Friends Online
            </h3>
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
          </div>
        )}

        {/* Trending Tags */}
        <div className="bg-[rgba(var(--glass-rgb),var(--glass-alpha-low))] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] p-4">
          <h3 className="text-[color:var(--text-2)] text-sm font-medium mb-3">
            Trending Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map((tag, index) => (
              <motion.button 
                key={tag}
                className="text-xs bg-[color:var(--glass-rgb)]/10 px-3 py-1.5 rounded-full text-[color:var(--text-1)] hover:bg-[color:var(--glass-rgb)]/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                #{tag}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-[rgba(var(--glass-rgb),var(--glass-alpha-low))] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] p-4">
          <h3 className="text-[color:var(--text-2)] text-sm font-medium mb-3">
            Your Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[color:var(--text-2)]">Posts</span>
              <span className="text-sm font-medium text-[color:var(--text-1)]">42</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[color:var(--text-2)]">Followers</span>
              <span className="text-sm font-medium text-[color:var(--text-1)]">128</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[color:var(--text-2)]">Following</span>
              <span className="text-sm font-medium text-[color:var(--text-1)]">89</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;