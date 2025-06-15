import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Search, TrendingUp, Users, Hash, 
  Grid3X3, List, Filter as FilterIcon, Sparkles 
} from 'lucide-react';
import type { Entry, Author } from '../types/models';
import PostCard from '../components/PostCard';
import AnimatedButton from '../components/ui/AnimatedButton';
import AnimatedGradient from '../components/ui/AnimatedGradient';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Avatar from '../components/Avatar/Avatar';
import Loader from '../components/ui/Loader';

type ViewMode = 'grid' | 'list';
type ExploreTab = 'trending' | 'authors' | 'categories' | 'recent';

interface TrendingAuthor extends Author {
  follower_count: number;
  post_count: number;
  is_following?: boolean;
}

interface Category {
  name: string;
  count: number;
  color: string;
}

export const ExplorePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ExploreTab>('trending');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Entry[]>([]);
  const [authors, setAuthors] = useState<TrendingAuthor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingAuthors, setFollowingAuthors] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchExploreData();
  }, [activeTab, searchQuery]);

  // Utility to get consistent color for categories
  const getCategoryColor = (categoryName: string, index: number) => {
    const colors = [
      'var(--primary-blue)',
      'var(--primary-purple)',
      'var(--primary-teal)',
      'var(--primary-pink)',
      'var(--primary-coral)',
      'var(--primary-violet)',
      'var(--primary-yellow)'
    ];
    return colors[index % colors.length];
  };

  const fetchExploreData = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with API calls
      if (activeTab === 'trending') {
        const mockPosts: Entry[] = [
          {
            id: '1',
            url: 'http://localhost:8000/api/entries/1/',
            author: {
              id: '201',
              url: 'http://localhost:8000/api/authors/201/',
              username: 'techexplorer',
              email: 'tech@example.com',
              display_name: 'Tech Explorer',
              profile_image: 'https://i.pravatar.cc/150?u=tech',
              is_approved: true,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            title: 'The Future of Web Development in 2024',
            content: 'An in-depth look at emerging technologies shaping the web...',
            content_type: 'text/markdown' as const,
            visibility: 'public' as const,
            categories: ['technology', 'web-development'],
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            likes_count: 156,
            comments_count: 42,
          },
          {
            id: '2',
            url: 'http://localhost:8000/api/entries/2/',
            author: {
              id: '202',
              url: 'http://localhost:8000/api/authors/202/',
              username: 'designpro',
              email: 'design@example.com',
              display_name: 'Design Pro',
              profile_image: 'https://i.pravatar.cc/150?u=design',
              is_approved: true,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            title: 'Creating Beautiful Gradients with CSS',
            content: 'Learn how to create stunning gradient effects...',
            content_type: 'text/markdown' as const,
            visibility: 'public' as const,
            categories: ['design', 'css'],
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            updated_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            likes_count: 89,
            comments_count: 23,
          },
        ];
        setPosts(mockPosts);
      } else if (activeTab === 'authors') {
        const mockAuthors: TrendingAuthor[] = [
          {
            id: '201',
            url: 'http://localhost:8000/api/authors/201/',
            username: 'techexplorer',
            email: 'tech@example.com',
            display_name: 'Tech Explorer',
            profile_image: 'https://i.pravatar.cc/150?u=tech',
            bio: 'Exploring the latest in technology and sharing insights',
            follower_count: 1234,
            post_count: 45,
            is_approved: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: '202',
            url: 'http://localhost:8000/api/authors/202/',
            username: 'designpro',
            email: 'design@example.com',
            display_name: 'Design Pro',
            profile_image: 'https://i.pravatar.cc/150?u=design',
            bio: 'UI/UX designer passionate about creating beautiful experiences',
            follower_count: 892,
            post_count: 32,
            is_approved: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: '203',
            url: 'http://localhost:8000/api/authors/203/',
            username: 'codemaster',
            email: 'code@example.com',
            display_name: 'Code Master',
            bio: 'Full-stack developer sharing coding tips and tricks',
            follower_count: 567,
            post_count: 28,
            is_approved: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setAuthors(mockAuthors);
      } else if (activeTab === 'categories') {
        const mockCategories: Category[] = [
          { name: 'Technology', count: 156, color: 'var(--primary-blue)' },
          { name: 'Design', count: 123, color: 'var(--primary-purple)' },
          { name: 'Programming', count: 98, color: 'var(--primary-teal)' },
          { name: 'AI/ML', count: 76, color: 'var(--primary-pink)' },
          { name: 'Web Development', count: 65, color: 'var(--primary-coral)' },
          { name: 'Mobile Dev', count: 54, color: 'var(--primary-violet)' },
          { name: 'Data Science', count: 45, color: 'var(--primary-yellow)' },
        ];
        // Ensure all categories have colors
        const categoriesWithColors = mockCategories.map((cat, index) => ({
          ...cat,
          color: cat.color || getCategoryColor(cat.name, index)
        }));
        setCategories(categoriesWithColors);
      }
      
      // Apply search filter
      if (searchQuery) {
        // Filter logic here
      }
    } catch (error) {
      console.error('Error fetching explore data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowAuthor = async (authorId: string) => {
    setFollowingAuthors(prev => new Set(prev).add(authorId));
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update UI to show following
      setAuthors(prev => 
        prev.map(author => 
          author.id === authorId ? { ...author, is_following: true } : author
        )
      );
    } catch (error) {
      console.error('Error following author:', error);
    } finally {
      setFollowingAuthors(prev => {
        const newSet = new Set(prev);
        newSet.delete(authorId);
        return newSet;
      });
    }
  };

  const tabs = [
    { id: 'trending', label: 'Trending', icon: TrendingUp, gradientColors: ['var(--primary-purple)', 'var(--primary-pink)'] },
    { id: 'authors', label: 'Authors', icon: Users, gradientColors: ['var(--primary-teal)', 'var(--primary-blue)'] },
    { id: 'categories', label: 'Categories', icon: Hash, gradientColors: ['var(--primary-yellow)', 'var(--primary-coral)'] },
    { id: 'recent', label: 'Recent', icon: Sparkles, gradientColors: ['var(--primary-violet)', 'var(--primary-purple)'] },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <AnimatedGradient
              gradientColors={['var(--primary-purple)', 'var(--primary-pink)', 'var(--primary-teal)', 'var(--primary-violet)', 'var(--primary-yellow)']}
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
              textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              duration={15}
            >
              <Compass className="w-6 h-6" />
            </AnimatedGradient>
            <div>
              <h1 className="text-2xl font-bold text-text-1">Explore</h1>
              <p className="text-sm text-text-2">Discover amazing content and people</p>
            </div>
          </div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full md:w-96"
          >
            <div className="relative">
              <Input
                type="text"
                placeholder="Search posts, authors, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={18} />}
                className="pl-10"
              />
              <motion.div
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FilterIcon className="w-5 h-5 text-text-2 cursor-pointer hover:text-text-1" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto pb-3 pr-2 scrollbar-hide">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return isActive ? (
              <motion.div
                key={`${tab.id}-active`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AnimatedGradient
                  gradientColors={tab.gradientColors}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium shadow-md cursor-pointer flex-shrink-0"
                  textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center space-x-2"
                  duration={20}
                  onClick={() => setActiveTab(tab.id as ExploreTab)}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </AnimatedGradient>
              </motion.div>
            ) : (
              <motion.button
                key={`${tab.id}-inactive`}
                onClick={() => setActiveTab(tab.id as ExploreTab)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium glass-card-subtle text-text-1 hover:text-text-1 transition-all cursor-pointer flex-shrink-0"
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}

          {/* View Mode Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="ml-auto flex items-center space-x-2"
          >
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid' 
                  ? 'bg-[var(--primary-violet)]/20 text-[var(--primary-violet)]' 
                  : 'text-text-2 hover:text-text-1'
              }`}
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list' 
                  ? 'bg-[var(--primary-violet)]/20 text-[var(--primary-violet)]' 
                  : 'text-text-2 hover:text-text-1'
              }`}
            >
              <List size={18} />
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader size="lg" message="Discovering content..." />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* Trending Posts */}
          {activeTab === 'trending' && (
            <motion.div
              key="trending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}
            >
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Authors Grid */}
          {activeTab === 'authors' && (
            <motion.div
              key="authors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {authors.map((author, index) => (
                <motion.div
                  key={author.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="main" hoverable className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="mb-4"
                      >
                        <Avatar
                          imgSrc={author.profile_image}
                          alt={author.display_name}
                          size="xl"
                        />
                      </motion.div>
                      
                      <h3 className="font-semibold text-lg text-text-1 mb-1">
                        {author.display_name}
                      </h3>
                      <p className="text-sm text-text-2 mb-3">@{author.username}</p>
                      
                      {author.bio && (
                        <p className="text-sm text-text-2 mb-4 line-clamp-2">
                          {author.bio}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 mb-4 text-sm">
                        <div>
                          <span className="font-semibold text-text-1">{author.follower_count}</span>
                          <span className="text-text-2 ml-1">followers</span>
                        </div>
                        <div>
                          <span className="font-semibold text-text-1">{author.post_count}</span>
                          <span className="text-text-2 ml-1">posts</span>
                        </div>
                      </div>
                      
                      <AnimatedButton
                        size="sm"
                        variant={author.is_following ? 'secondary' : 'primary'}
                        onClick={() => handleFollowAuthor(author.id)}
                        loading={followingAuthors.has(author.id)}
                        className="w-full"
                      >
                        {author.is_following ? 'Following' : 'Follow'}
                      </AnimatedButton>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Categories */}
          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {categories.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card
                    variant="main"
                    hoverable
                    className="p-6 cursor-pointer text-center h-full flex flex-col justify-center min-h-[160px] border-l-4 transition-all"
                    style={{
                      borderLeftColor: category.color,
                    }}
                  >
                    <motion.div
                      className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                      style={{
                        backgroundColor: `${category.color}20`,
                      }}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Hash size={24} style={{ color: category.color }} />
                    </motion.div>
                    <h3 className="font-semibold text-text-1 mb-1">
                      {category.name}
                    </h3>
                    <p className="text-sm text-text-2">
                      {category.count} posts
                    </p>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default ExplorePage;