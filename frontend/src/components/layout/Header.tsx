import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, Bell, Sun, Moon, User, LogOut, Settings, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../../lib/theme';
import LoadingImage from '../ui/LoadingImage';
import Button from '../ui/Button';
import AnimatedGradient from '../ui/AnimatedGradient';

interface HeaderProps {
  onSearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Mock notifications data
  const notifications = [
    { id: 1, type: 'follow', user: 'Alice Chen', time: '5m ago', read: false },
    { id: 2, type: 'like', user: 'Bob Smith', post: 'Your post about React', time: '1h ago', read: false },
    { id: 3, type: 'comment', user: 'Carol Johnson', post: 'TypeScript Tips', time: '2h ago', read: true },
  ];

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
  };

  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
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
                {user && notifications.some(n => !n.read) && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
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
                        {notifications.map((notif) => (
                          <motion.div
                            key={notif.id}
                            className={`px-4 py-3 hover:bg-glass-low transition-colors cursor-pointer ${
                              !notif.read ? 'bg-glass-low/50' : ''
                            }`}
                            whileHover={{ x: 2 }}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                notif.type === 'follow' ? 'bg-[var(--primary-purple)]/20' :
                                notif.type === 'like' ? 'bg-[var(--primary-pink)]/20' :
                                'bg-[var(--primary-teal)]/20'
                              }`}>
                                {notif.type === 'follow' ? <User size={16} className="text-[var(--primary-purple)]" /> :
                                 notif.type === 'like' ? <motion.div
                                   animate={{ scale: [1, 1.2, 1] }}
                                   transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                                 >❤️</motion.div> :
                                 <MessageCircle size={16} className="text-[var(--primary-teal)]" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-text-1">
                                  <span className="font-medium">{notif.user}</span>
                                  {notif.type === 'follow' && ' started following you'}
                                  {notif.type === 'like' && ` liked ${notif.post}`}
                                  {notif.type === 'comment' && ` commented on ${notif.post}`}
                                </p>
                                <p className="text-xs text-text-2 mt-1">{notif.time}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        <Link
                          to="/notifications"
                          className="block px-4 py-2 text-center text-sm text-[var(--primary-purple)] hover:bg-glass-low transition-colors"
                          onClick={() => setShowNotifications(false)}
                        >
                          View all notifications
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