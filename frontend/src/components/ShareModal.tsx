import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Share2, Copy, Check, Mail, MessageCircle,
  Twitter, Facebook, Linkedin, Link2, Users,
  Globe, Lock, UserCheck, Send, Search
} from 'lucide-react';
import type { Entry, Author } from '../types/models';
import { api } from '../services/api';
import AnimatedButton from './ui/AnimatedButton';
import Input from './ui/Input';
import Avatar from './Avatar/Avatar';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Entry;
  shareUrl?: string;
}

interface ShareOption {
  id: string;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string;
  action: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  post,
  shareUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'external' | 'internal'>('external');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Author[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const postUrl = shareUrl || `${window.location.origin}/posts/${post.id}`;
  const shareText = `Check out "${post.title}" by ${
    typeof post.author === 'object' ? post.author.display_name : 'Unknown'
  }`;

  useEffect(() => {
    if (searchQuery && activeTab === 'internal') {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery, activeTab]);

  const searchUsers = async () => {
    setIsSearching(true);
    try {
      const response = await api.getAuthors({
        search: searchQuery,
        is_approved: true,
        is_active: true,
      });
      // Handle both paginated and direct array responses
      setUsers(response.results || response || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(postUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(shareText);
    
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
    };
    
    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  const handleSendToUsers = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsSending(true);
    try {
      // API call to send post to selected users
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSentSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset state
        setSentSuccess(false);
        setSelectedUsers([]);
        setMessage('');
      }, 1500);
    } catch (error) {
      console.error('Error sending post:', error);
    } finally {
      setIsSending(false);
    }
  };

  const shareOptions: ShareOption[] = [
    {
      id: 'copy',
      label: 'Copy Link',
      icon: Copy,
      color: 'text-text-1',
      action: handleCopyLink,
    },
    {
      id: 'twitter',
      label: 'Twitter',
      icon: Twitter,
      color: 'text-[#1DA1F2]',
      action: () => handleShare('twitter'),
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: Facebook,
      color: 'text-[#1877F2]',
      action: () => handleShare('facebook'),
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: Linkedin,
      color: 'text-[#0A66C2]',
      action: () => handleShare('linkedin'),
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      color: 'text-text-1',
      action: () => handleShare('email'),
    },
  ];

  const getVisibilityIcon = () => {
    switch (post.visibility) {
      case 'public':
        return Globe;
      case 'friends':
        return Users;
      case 'unlisted':
        return Lock;
      default:
        return Globe;
    }
  };

  const VisibilityIcon = getVisibilityIcon();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg glass-card-prominent rounded-lg shadow-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border-1">
              <div className="flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-text-1" />
                <h2 className="text-lg font-semibold text-text-1">Share Post</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-glass-low transition-colors"
              >
                <X size={20} className="text-text-2" />
              </motion.button>
            </div>
            
            {/* Post Preview */}
            <div className="p-6 border-b border-border-1">
              <div className="glass-card-subtle rounded-lg p-4">
                <h3 className="font-medium text-text-1 mb-2 line-clamp-2">{post.title}</h3>
                <div className="flex items-center justify-between text-sm text-text-2">
                  <span>
                    by {typeof post.author === 'object' ? post.author.display_name : 'Unknown'}
                  </span>
                  <div className="flex items-center space-x-1">
                    <VisibilityIcon size={14} />
                    <span className="capitalize">{post.visibility}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-border-1">
              <button
                onClick={() => setActiveTab('external')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'external'
                    ? 'text-text-1 border-b-2 border-[var(--primary-violet)]'
                    : 'text-text-2 hover:text-text-1'
                }`}
              >
                Share Externally
              </button>
              <button
                onClick={() => setActiveTab('internal')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'internal'
                    ? 'text-text-1 border-b-2 border-[var(--primary-violet)]'
                    : 'text-text-2 hover:text-text-1'
                }`}
              >
                Send to Users
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'external' ? (
                  <motion.div
                    key="external"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {/* URL Input */}
                    <div className="mb-6">
                      <div className="relative">
                        <Input
                          type="text"
                          value={postUrl}
                          readOnly
                          className="pr-12"
                          icon={<Link2 size={18} />}
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleCopyLink}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded hover:bg-glass-low transition-colors"
                        >
                          {copied ? (
                            <Check size={18} className="text-green-500" />
                          ) : (
                            <Copy size={18} className="text-text-2" />
                          )}
                        </motion.button>
                      </div>
                      {copied && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-green-500 mt-1"
                        >
                          Link copied to clipboard!
                        </motion.p>
                      )}
                    </div>
                    
                    {/* Share Options */}
                    <div className="grid grid-cols-2 gap-3">
                      {shareOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <motion.button
                            key={option.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={option.action}
                            className="flex items-center space-x-3 p-3 rounded-lg glass-card-subtle hover:bg-glass-low transition-all"
                          >
                            <Icon size={20} className={option.color} />
                            <span className="text-text-1">{option.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="internal"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {/* User Search */}
                    <div className="mb-4">
                      <Input
                        type="text"
                        placeholder="Search users to share with..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search size={18} />}
                      />
                    </div>
                    
                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-text-2 mb-2">Sharing with:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedUsers.map((userId) => {
                            const user = users.find(u => u.id === userId);
                            if (!user) return null;
                            
                            return (
                              <motion.div
                                key={userId}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[var(--primary-violet)]/20 text-sm"
                              >
                                <Avatar
                                  imgSrc={user.profile_image}
                                  alt={user.display_name}
                                  size="sm"
                                />
                                <span className="text-text-1">{user.display_name}</span>
                                <button
                                  onClick={() => setSelectedUsers(prev => 
                                    prev.filter(id => id !== userId)
                                  )}
                                  className="text-text-2 hover:text-text-1"
                                >
                                  <X size={14} />
                                </button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* User List */}
                    {isSearching ? (
                      <div className="text-center py-8">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="inline-block"
                        >
                          <MessageCircle size={24} className="text-text-2" />
                        </motion.div>
                        <p className="text-sm text-text-2 mt-2">Searching...</p>
                      </div>
                    ) : users.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {users.map((user) => {
                          const isSelected = selectedUsers.includes(user.id);
                          
                          return (
                            <motion.button
                              key={user.id}
                              whileHover={{ x: 4 }}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedUsers(prev => prev.filter(id => id !== user.id));
                                } else {
                                  setSelectedUsers(prev => [...prev, user.id]);
                                }
                              }}
                              className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-all ${
                                isSelected
                                  ? 'bg-[var(--primary-violet)]/20'
                                  : 'hover:bg-glass-low'
                              }`}
                            >
                              <Avatar
                                imgSrc={user.profile_image}
                                alt={user.display_name}
                                size="md"
                              />
                              <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-text-1">{user.display_name}</p>
                                <p className="text-xs text-text-2">@{user.username}</p>
                              </div>
                              {isSelected && (
                                <UserCheck size={18} className="text-[var(--primary-violet)]" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    ) : searchQuery ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-text-2">No users found</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-text-2">Search for users to share with</p>
                      </div>
                    )}
                    
                    {/* Message Input */}
                    {selectedUsers.length > 0 && (
                      <div className="mt-4">
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Add a message (optional)..."
                          className="w-full px-4 py-3 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-[var(--primary-violet)] focus:border-transparent transition-all duration-200 resize-none"
                          rows={3}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-border-1">
              <AnimatedButton
                variant="ghost"
                onClick={onClose}
                disabled={isSending}
              >
                Cancel
              </AnimatedButton>
              
              {activeTab === 'internal' && selectedUsers.length > 0 && (
                <AnimatedButton
                  variant="primary"
                  onClick={handleSendToUsers}
                  loading={isSending}
                  icon={sentSuccess ? <Check size={16} /> : <Send size={16} />}
                  disabled={selectedUsers.length === 0}
                >
                  {sentSuccess ? 'Sent!' : `Send to ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`}
                </AnimatedButton>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ShareModal;