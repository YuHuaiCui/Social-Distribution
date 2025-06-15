import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Compass, PlusCircle, MessageCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCreatePost } from '../context/CreatePostContext';

export const Footer: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { openCreatePost } = useCreatePost();
  
  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: PlusCircle, label: 'Create', path: null, action: openCreatePost },
    { icon: MessageCircle, label: 'Inbox', path: '/inbox' },
    { icon: User, label: 'Profile', path: user ? `/authors/${user.id}` : '/login' },
  ];

  const isActive = (path: string | null) => {
    if (!path) return false;
    return location.pathname === path;
  };

  return (
    <footer className="sticky bottom-0 z-dropdown glass-card-prominent border-t border-glass-prominent mt-auto">
      <nav className="container mx-auto px-4">
        <ul className="flex justify-around items-center py-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            const content = (
              <motion.div
                className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                  active ? 'text-[var(--primary-purple)]' : 'text-text-2 hover:text-text-1'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={active ? { y: [0, -2, 0] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Icon size={24} />
                </motion.div>
                <span className="text-xs mt-1 font-medium">{item.label}</span>
                {active && (
                  <motion.div
                    className="absolute -bottom-2 w-1 h-1 rounded-full bg-[var(--primary-purple)]"
                    layoutId="footerIndicator"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            );

            if (item.path) {
              return (
                <li key={item.label}>
                  <Link to={item.path} className="relative">
                    {content}
                  </Link>
                </li>
              );
            } else {
              return (
                <li key={item.label}>
                  <button 
                    onClick={item.action} 
                    className="relative"
                    aria-label={item.label}
                  >
                    {content}
                  </button>
                </li>
              );
            }
          })}
        </ul>
      </nav>
    </footer>
  );
};

export default Footer;