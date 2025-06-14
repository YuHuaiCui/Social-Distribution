import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Search, 
  Compass, 
  Bell, 
  Settings, 
  User,
  Mail,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AnimatedLogo from '../ui/AnimatedLogo';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/explore', icon: Compass, label: 'Explore' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/inbox', icon: Mail, label: 'Inbox' },
  { path: '/notifications', icon: Bell, label: 'Notifications' },
  { path: '/profile', icon: User, label: 'Profile' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export const LeftSidebar: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <aside className="sticky top-0 h-screen w-64 flex flex-col border-r border-gray-800/50 bg-[var(--card-bg)] backdrop-blur-sm">
      <div className="p-6">
        <AnimatedLogo />
      </div>
      
      <nav className="flex-1 px-3">
        {navItems.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon 
                    size={20} 
                    className={isActive ? 'text-purple-400' : ''} 
                  />
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800/50">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white font-bold">
              {user.display_name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{user.display_name}</p>
            <p className="text-xs text-gray-400">@{user.username}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};