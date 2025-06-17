import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Author } from '../types/models';
import AnimatedGradient from './ui/AnimatedGradient';

interface RightSidebarProps {
  friends?: Author[];
  trendingTags?: string[];
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  friends = [],
  trendingTags = ['technology', 'design', 'programming', 'webdev', 'opensource'],
}) => {
  return (
    <aside className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Friends Online */}
        {friends.length > 0 && (
          <div className="rounded-2xl border border-border-1 p-4">
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