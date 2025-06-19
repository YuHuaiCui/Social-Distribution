import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, Bell, Sun, Moon, User, LogOut, Settings, MessageCircle, Heart, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../../lib/theme';
import { useNotifications } from '../context/NotificationContext';
import LoadingImage from '../ui/LoadingImage';
import Button from '../ui/Button';
import AnimatedGradient from '../ui/AnimatedGradient';
import { NotificationBadge } from '../NotificationBadge';

interface HeaderProps {
  onSearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, refreshNotifications } = useNotifications();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setShowUserMenu(false);
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close one dropdown when opening another
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
    if (!showNotifications) {
      refreshNotifications();
    }
  };

  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  // Helper function to format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Search is handled by the modal now

  return (
    <header className="sticky top-0 z-dropdown glass-card-prominent border-b border-glass-prominent">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <Link to="/home" className="flex items-center space-x-3">
            <AnimatedGradient
              gradientColors={['var(--primary-purple)', 'var(--primary-pink)', 'var(--primary-teal)', 'var(--primary-violet)', 'var(--primary-yellow)']}
              className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg"
              textClassName="text-white font-bold text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              duration={15}
            >
              S
            </AnimatedGradient>
            <span className="text-xl font-semibold text-text-1">Social Distribution</span>
          </Link>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/home" 
              className="text-text-2 hover:text-text-1 transition-colors font-medium"
            >
              Feed
            </Link>
            <Link 
              to="/explore" 
              className="text-text-2 hover:text-text-1 transition-colors font-medium"
            >
              Explore
            </Link>
            <Link 
              to="/inbox" 
              className="text-text-2 hover:text-text-1 transition-colors font-medium"
            >
              Inbox
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSearchClick}
              className="p-2"
              aria-label="Search"
            >
              <Search size={20} />
            </Button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 relative"
                aria-label="Notifications"
                onClick={handleNotificationClick}
              >
                <Bell size={20} />
                {user && unreadCount > 0 && (
                  <NotificationBadge 
                    count={unreadCount} 
                    size="sm" 
                    className="absolute -top-1 -right-1"
                  />
                )}
              </Button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-80 glass-card-prominent rounded-lg shadow-lg py-2 max-h-96 overflow-y-auto overflow-x-hidden"
                  >
                    <div className="px-4 py-2 border-b border-border-1">
                      <h3 className="font-semibold text-text-1">Notifications</h3>
                    </div>
                    {notifications.length > 0 ? (
                      <div>
                        {notifications.map((notif) => {
                          const senderName = typeof notif.sender === 'object' && notif.sender 
                            ? notif.sender.display_name 
                            : 'Someone';
                          
                          const timeAgo = formatTimeAgo(notif.created_at);
                          
                          return (
                            <motion.div
                              key={notif.id}
                              className={`px-4 py-3 hover:bg-glass-low transition-colors cursor-pointer ${
                                !notif.is_read ? 'bg-glass-low/50' : ''
                              }`}
                              whileHover={{ x: 2 }}
                              onClick={() => {
                                if (!notif.is_read) {
                                  markAsRead([notif.id]);
                                }
                                if (notif.item_type === 'follow') {
                                  navigate('/inbox');
                                } else if (notif.item_type === 'comment' || notif.item_type === 'like') {
                                  // Navigate to the related post if we have the data
                                  if (notif.content_data && notif.content_data.type === notif.item_type) {
                                    const data = notif.content_data.data as any;
                                    const entryId = typeof data.entry === 'string' 
                                      ? data.entry.split('/').filter(Boolean).pop()
                                      : data.entry?.id;
                                    if (entryId) {
                                      navigate(`/posts/${entryId}`);
                                    }
                                  }
                                } else if (notif.item_type === 'entry') {
                                  // For entry notifications, navigate to the entry itself
                                  if (notif.content_data && notif.content_data.type === 'entry') {
                                    const entryData = notif.content_data.data as any;
                                    const entryId = typeof entryData.id === 'string' 
                                      ? entryData.id.split('/').filter(Boolean).pop()
                                      : entryData.id;
                                    if (entryId) {
                                      navigate(`/posts/${entryId}`);
                                    }
                                  }
                                }
                                setShowNotifications(false);
                              }}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  notif.item_type === 'follow' ? 'bg-[var(--primary-purple)]/20' :
                                  notif.item_type === 'like' ? 'bg-[var(--primary-pink)]/20' :
                                  notif.item_type === 'comment' ? 'bg-[var(--primary-teal)]/20' :
                                  'bg-[var(--primary-yellow)]/20'
                                }`}>
                                  {notif.item_type === 'follow' ? <UserPlus size={16} className="text-[var(--primary-purple)]" /> :
                                   notif.item_type === 'like' ? <Heart size={16} className="text-[var(--primary-pink)]" /> :
                                   notif.item_type === 'comment' ? <MessageCircle size={16} className="text-[var(--primary-teal)]" /> :
                                   <Bell size={16} className="text-[var(--primary-yellow)]" />}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-text-1">
                                    <span className="font-medium">{senderName}</span>
                                    {notif.item_type === 'follow' && ' wants to follow you'}
                                    {notif.item_type === 'like' && ' liked your post'}
                                    {notif.item_type === 'comment' && ' commented on your post'}
                                    {notif.item_type === 'entry' && ' shared a post with you'}
                                    {notif.item_type === 'entry_link' && ' shared a link'}
                                  </p>
                                  <p className="text-xs text-text-2 mt-1">{timeAgo}</p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                        <Link
                          to="/inbox"
                          className="block px-4 py-2 text-center text-sm text-[var(--primary-purple)] hover:bg-glass-low transition-colors"
                          onClick={() => setShowNotifications(false)}
                        >
                          View all in inbox
                        </Link>
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center text-text-2">
                        No new notifications
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme}
                  initial={{ 
                    y: theme === 'light' ? -30 : 30, 
                    opacity: 0,
                    rotate: theme === 'light' ? -180 : 180,
                    scale: 0.5
                  }}
                  animate={{ 
                    y: 0, 
                    opacity: 1,
                    rotate: 0,
                    scale: 1
                  }}
                  exit={{ 
                    y: theme === 'light' ? 30 : -30, 
                    opacity: 0,
                    rotate: theme === 'light' ? 180 : -180,
                    scale: 0.5
                  }}
                  transition={{ 
                    duration: 0.5,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                >
                  {theme === 'light' ? (
                    <Moon size={20} className="text-[var(--primary-purple)]" />
                  ) : (
                    <Sun size={20} className="text-[var(--primary-yellow)]" />
                  )}
                </motion.div>
              </AnimatePresence>
            </Button>

            {/* User Menu */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={handleUserMenuClick}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-glass-low transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden neumorphism-sm">
                    {user.profile_image ? (
                      <LoadingImage
                        src={user.profile_image}
                        alt={user.display_name}
                        className="w-full h-full"
                        loaderSize={16}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-64 glass-card-prominent rounded-lg shadow-lg py-2 overflow-x-hidden overflow-y-auto max-h-96"
                    >
                      <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                        <Link
                          to={`/authors/${user.id}`}
                          className="flex items-center px-4 py-2.5 text-text-1 hover:bg-glass-low transition-all relative overflow-hidden group cursor-pointer"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-[var(--primary-purple)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                          <User size={18} className="mr-3 relative z-10" />
                          <span className="relative z-10">Profile</span>
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                        <Link
                          to="/settings"
                          className="flex items-center px-4 py-2.5 text-text-1 hover:bg-glass-low transition-all relative overflow-hidden group cursor-pointer"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-[var(--primary-teal)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                          <Settings size={18} className="mr-3 relative z-10" />
                          <span className="relative z-10">Settings</span>
                        </Link>
                      </motion.div>
                      <hr className="my-2 border-border-1" />
                      <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-2.5 text-text-1 hover:bg-glass-low transition-all relative overflow-hidden group cursor-pointer text-left"
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-[var(--primary-pink)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                          <LogOut size={18} className="mr-3 relative z-10" />
                          <span className="relative z-10">Logout</span>
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Search is now handled by SearchModal */}
      </div>
    </header>
  );
};

export default Header;