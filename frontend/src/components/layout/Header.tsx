import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, Bell, Sun, Moon, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../../lib/theme';
import LoadingImage from '../ui/LoadingImage';
import Button from '../ui/Button';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-40 glass-card-prominent border-b border-glass-prominent">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <Link to="/home" className="flex items-center space-x-3">
            <motion.div 
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-white font-bold text-xl">S</span>
            </motion.div>
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
              onClick={() => setShowSearch(!showSearch)}
              className="p-2"
              aria-label="Search"
            >
              <Search size={20} />
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 relative"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {user && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </Button>

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
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </motion.div>
              </AnimatePresence>
            </Button>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-glass-low transition-colors"
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
                  <Menu size={16} className="text-text-2" />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-64 glass-card-prominent rounded-lg shadow-lg py-2"
                    >
                      <Link
                        to={`/authors/${user.id}`}
                        className="flex items-center px-4 py-2 text-text-1 hover:bg-glass-low transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User size={18} className="mr-3" />
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2 text-text-1 hover:bg-glass-low transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings size={18} className="mr-3" />
                        Settings
                      </Link>
                      <hr className="my-2 border-border-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-text-1 hover:bg-glass-low transition-colors"
                      >
                        <LogOut size={18} className="mr-3" />
                        Logout
                      </button>
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

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleSearch} className="py-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts, authors, or tags..."
                    className="flex-1 px-4 py-2 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    autoFocus
                  />
                  <Button type="submit" variant="primary" size="md">
                    Search
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Header;