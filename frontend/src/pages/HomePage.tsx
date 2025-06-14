import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Users, Star, Loader, Plus } from 'lucide-react';
import { useAuth } from '../components/context/AuthContext';
import { useCreatePost } from '../components/context/CreatePostContext';
import type { Entry } from '../types/models';
import PostCard from '../components/PostCard';
import AnimatedButton from '../components/ui/AnimatedButton';
import Card from '../components/ui/Card';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { openCreatePost } = useCreatePost();
  const [feed, setFeed] = useState<'all' | 'friends' | 'liked' | 'saved'>('all');
  const [posts, setPosts] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [feed]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      // For now, we'll use mock data since entry endpoints aren't implemented
      // Once backend is ready, use: const response = await api.getEntries({ visibility: feed });
      
      // Mock data for demonstration
      const mockPosts: Entry[] = [
        {
          id: '1',
          url: 'http://localhost:8000/api/entries/1/',
          author: user || {
            id: '123',
            url: 'http://localhost:8000/api/authors/123/',
            username: 'demo',
            email: 'demo@example.com',
            display_name: 'Demo User',
            is_approved: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          title: 'Welcome to Social Distribution',
          content: 'This is a **demo post** showing the markdown capabilities of our platform.',
          content_type: 'text/markdown' as const,
          visibility: 'public' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          likes_count: 5,
          comments_count: 2,
        }
      ];
      
      setPosts(mockPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="glass-card-main rounded-full p-5 shadow-lg"
          >
            <Loader className="w-8 h-8 text-brand-500" />
          </motion.div>
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <Card variant="main" className="text-center py-12">
          <Globe size={48} className="mx-auto mb-4 text-text-2" />
          <h3 className="font-medium text-lg mb-2">No posts found</h3>
          <p className="text-text-2 mb-4">
            {feed === 'friends' ? 'Follow more people to see their posts here' :
             feed === 'liked' ? 'Posts you like will appear here' :
             feed === 'saved' ? 'Saved posts will appear here' :
             'Be the first to create a post!'}
          </p>
          {feed === 'all' && (
            <AnimatedButton onClick={openCreatePost} icon={<Plus size={18} />}>
              Create Post
            </AnimatedButton>
          )}
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {posts.map(post => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              layout
            >
              <PostCard post={post} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Feed Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-1">
          {feed === 'friends' ? 'Friends Feed' : 
           feed === 'liked' ? 'Liked Posts' : 
           feed === 'saved' ? 'Saved Posts' : 'Social Stream'}
        </h1>
        
        {/* Feed Tabs */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFeed('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              feed === 'all' 
                ? 'bg-brand-500 text-white' 
                : 'text-text-2 hover:text-text-1 hover:bg-glass-low'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFeed('friends')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              feed === 'friends' 
                ? 'bg-brand-500 text-white' 
                : 'text-text-2 hover:text-text-1 hover:bg-glass-low'
            }`}
          >
            <Users size={16} className="inline mr-1" />
            Friends
          </button>
          <button
            onClick={() => setFeed('liked')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              feed === 'liked' 
                ? 'bg-brand-500 text-white' 
                : 'text-text-2 hover:text-text-1 hover:bg-glass-low'
            }`}
          >
            <Star size={16} className="inline mr-1" />
            Liked
          </button>
        </div>
      </div>

      {/* New Post Button */}
      {(feed === 'all' || feed === 'friends') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <AnimatedButton
            onClick={openCreatePost}
            variant="primary"
            size="lg"
            icon={<Plus size={20} />}
            className="w-full"
          >
            Create New Post
          </AnimatedButton>
        </motion.div>
      )}

      {/* Posts */}
      {renderContent()}
    </div>
  );
};

export default HomePage;