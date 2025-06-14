import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Inbox, UserPlus, Share2, Heart, MessageCircle, 
  Check, X, Clock, Bell 
} from 'lucide-react';
import AnimatedButton from '../components/ui/AnimatedButton';
import Card from '../components/ui/Card';
import Avatar from '../components/Avatar/Avatar';
import Loader from '../components/ui/Loader';

type InboxItemType = 'follow_request' | 'post_share' | 'like' | 'comment' | 'mention';

interface InboxItem {
  id: string;
  type: InboxItemType;
  from_author: {
    id: string;
    display_name: string;
    username: string;
    profile_image?: string;
  };
  created_at: string;
  is_read: boolean;
  data?: {
    post_id?: string;
    post_title?: string;
    comment_text?: string;
  };
}

const inboxTypeConfig = {
  follow_request: {
    icon: UserPlus,
    color: 'text-[var(--primary-purple)]',
    bgColor: 'bg-[var(--primary-purple)]/10',
    title: 'sent you a follow request',
  },
  post_share: {
    icon: Share2,
    color: 'text-[var(--primary-teal)]',
    bgColor: 'bg-[var(--primary-teal)]/10',
    title: 'shared a post with you',
  },
  like: {
    icon: Heart,
    color: 'text-[var(--primary-pink)]',
    bgColor: 'bg-[var(--primary-pink)]/10',
    title: 'liked your post',
  },
  comment: {
    icon: MessageCircle,
    color: 'text-[var(--primary-blue)]',
    bgColor: 'bg-[var(--primary-blue)]/10',
    title: 'commented on your post',
  },
  mention: {
    icon: Bell,
    color: 'text-[var(--primary-coral)]',
    bgColor: 'bg-[var(--primary-coral)]/10',
    title: 'mentioned you',
  },
};

export const InboxPage: React.FC = () => {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [filter, setFilter] = useState<InboxItemType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInboxItems();
  }, [filter]);

  const fetchInboxItems = async () => {
    setIsLoading(true);
    try {
      // Mock data for now
      const mockItems: InboxItem[] = [
        {
          id: '1',
          type: 'follow_request',
          from_author: {
            id: '123',
            display_name: 'Alice Chen',
            username: 'alicechen',
            profile_image: 'https://i.pravatar.cc/150?u=alice',
          },
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          is_read: false,
        },
        {
          id: '2',
          type: 'post_share',
          from_author: {
            id: '124',
            display_name: 'Bob Smith',
            username: 'bobsmith',
            profile_image: 'https://i.pravatar.cc/150?u=bob',
          },
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          is_read: false,
          data: {
            post_title: 'Introduction to Distributed Systems',
          },
        },
        {
          id: '3',
          type: 'like',
          from_author: {
            id: '125',
            display_name: 'Carol Johnson',
            username: 'caroljohnson',
          },
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          is_read: true,
          data: {
            post_title: 'My thoughts on React 18',
          },
        },
        {
          id: '4',
          type: 'comment',
          from_author: {
            id: '126',
            display_name: 'David Lee',
            username: 'davidlee',
            profile_image: 'https://i.pravatar.cc/150?u=david',
          },
          created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          is_read: true,
          data: {
            post_title: 'Understanding TypeScript',
            comment_text: 'Great article! This really helped me understand generics.',
          },
        },
      ];

      const filteredItems = filter === 'all' 
        ? mockItems 
        : mockItems.filter(item => item.type === filter);

      setItems(filteredItems);
    } catch (error) {
      console.error('Error fetching inbox:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowRequest = async (itemId: string, _accept: boolean) => {
    setProcessingItems(prev => new Set(prev).add(itemId));
    try {
      // API call would go here
      // if (accept) {
      //   await api.acceptFollowRequest(itemId);
      // } else {
      //   await api.rejectFollowRequest(itemId);
      // }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Remove item after processing
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error processing follow request:', error);
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const markAsRead = async (itemId: string) => {
    try {
      // API call would go here
      setItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, is_read: true } : item
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const filterButtons = [
    { value: 'all', label: 'All' },
    { value: 'follow_request', label: 'Follow Requests' },
    { value: 'post_share', label: 'Shared Posts' },
    { value: 'like', label: 'Likes' },
    { value: 'comment', label: 'Comments' },
  ];

  const unreadCount = items.filter(item => !item.is_read).length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full gradient-secondary flex items-center justify-center">
            <Inbox className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-1">Inbox</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-text-2">{unreadCount} unread notifications</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 mb-6"
      >
        {filterButtons.map((btn) => (
          <motion.button
            key={btn.value}
            onClick={() => setFilter(btn.value as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === btn.value
                ? 'bg-[var(--gradient-primary)] text-white'
                : 'glass-card-subtle text-text-2 hover:text-text-1'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={
              filter === btn.value
                ? {
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }
                : {}
            }
            transition={
              filter === btn.value
                ? {
                    backgroundPosition: {
                      duration: 8,
                      repeat: Infinity,
                    },
                  }
                : {}
            }
            style={
              filter === btn.value
                ? {
                    background: 'var(--gradient-primary)',
                    backgroundSize: '200% 200%',
                  }
                : {}
            }
          >
            {btn.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Inbox Items */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader size="lg" message="Loading notifications..." />
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <Card variant="main" className="inline-block p-12">
            <Inbox className="w-16 h-16 text-text-2 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-1 mb-2">No notifications</h3>
            <p className="text-text-2">
              {filter === 'all' 
                ? "You're all caught up!"
                : `No ${filter.replace('_', ' ')} notifications`}
            </p>
          </Card>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => {
            const config = inboxTypeConfig[item.type];
            const Icon = config.icon;
            const isProcessing = processingItems.has(item.id);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="mb-3"
                onMouseEnter={() => !item.is_read && markAsRead(item.id)}
              >
                <Card
                  variant={item.is_read ? 'subtle' : 'main'}
                  hoverable
                  className={`card-layout ${!item.is_read ? 'border-l-4 border-[var(--primary-purple)]' : ''}`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Author Avatar */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex-shrink-0"
                    >
                      <Avatar
                        imgSrc={item.from_author.profile_image}
                        alt={item.from_author.display_name}
                      />
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between card-content">
                        <div className="flex-1 mr-4">
                          <p className="text-text-1">
                            <span className="font-semibold">
                              {item.from_author.display_name}
                            </span>{' '}
                            <span className="text-text-2">{config.title}</span>
                          </p>
                          
                          {item.data?.post_title && (
                            <p className="text-sm text-text-2 mt-1">
                              "{item.data.post_title}"
                            </p>
                          )}
                          
                          {item.data?.comment_text && (
                            <p className="text-sm text-text-1 mt-2 p-3 glass-card-subtle rounded-lg">
                              {item.data.comment_text}
                            </p>
                          )}
                        </div>

                        {/* Type Icon */}
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                      </div>

                      {/* Footer - Always at bottom */}
                      <div className="card-footer mt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-xs text-text-2 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(item.created_at)}
                            </span>
                            {!item.is_read && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary-purple)]/20 text-[var(--primary-purple)]">
                                New
                              </span>
                            )}
                          </div>
                          
                          {/* Actions for follow requests */}
                          {item.type === 'follow_request' && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex space-x-2"
                            >
                              <AnimatedButton
                                size="sm"
                                variant="primary"
                                onClick={() => handleFollowRequest(item.id, true)}
                                disabled={isProcessing}
                                loading={isProcessing}
                                icon={<Check size={16} />}
                              >
                                Accept
                              </AnimatedButton>
                              <AnimatedButton
                                size="sm"
                                variant="ghost"
                                onClick={() => handleFollowRequest(item.id, false)}
                                disabled={isProcessing}
                                icon={<X size={16} />}
                              >
                                Decline
                              </AnimatedButton>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};

export default InboxPage;