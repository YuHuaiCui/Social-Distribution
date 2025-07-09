import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, Filter, FileText, Users, Hash, 
  Loader2 
} from 'lucide-react';
import type { Entry, Author } from '../types/models';
import { api } from '../services/api';
import PostCard from '../components/PostCard';
import AuthorCard from '../components/AuthorCard';
import AnimatedButton from '../components/ui/AnimatedButton';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

type SearchType = 'all' | 'posts' | 'authors' | 'tags';

interface SearchResults {
  posts: Entry[];
  authors: Author[];
  tags: { name: string; count: number }[];
}

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const tag = searchParams.get('tag') || '';
  const type = (searchParams.get('type') as SearchType) || 'all';
  
  const [searchQuery, setSearchQuery] = useState(query || tag);
  const [searchType, setSearchType] = useState<SearchType>(type);
  const [results, setResults] = useState<SearchResults>({
    posts: [],
    authors: [],
    tags: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (query || tag) {
      performSearch();
    }
  }, [query, tag, searchType]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const searchQuery = query || tag || '';
      
      let searchResults: SearchResults = {
        posts: [],
        authors: [],
        tags: [],
      };

      // Search authors if needed
      if ((searchType === 'all' || searchType === 'authors') && searchQuery) {
        try {
          const authorsResponse = await api.getAuthors({
            search: searchQuery,
            is_approved: true,
            is_active: true,
          });
          // Handle both paginated and direct array responses
          searchResults.authors = authorsResponse.results || authorsResponse || [];
        } catch (error) {
          console.error('Error searching authors:', error);
        }
      }

      // Search posts (entries) - TODO: implement when backend entry search is available
      if ((searchType === 'all' || searchType === 'posts') && searchQuery) {
        // For now, leaving posts empty until entry search is implemented in backend
        searchResults.posts = [];
      }

      // Search tags - TODO: implement when tag search is available
      if ((searchType === 'all' || searchType === 'tags') && searchQuery) {
        // For now, leaving tags empty until tag search is implemented
        searchResults.tags = [];
      }
      
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery, type: searchType });
    }
  };

  const handleTypeChange = (newType: SearchType) => {
    setSearchType(newType);
    setSearchParams({ q: query || tag, type: newType });
  };

  const searchTypes = [
    { id: 'all', label: 'All', icon: Search },
    { id: 'posts', label: 'Posts', icon: FileText },
    { id: 'authors', label: 'Authors', icon: Users },
    { id: 'tags', label: 'Tags', icon: Hash },
  ];

  const getTotalResults = () => {
    return results.posts.length + results.authors.length + results.tags.length;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Search Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, people, or tags..."
              icon={<Search size={18} />}
              className="text-lg"
            />
          </div>
          <AnimatedButton
            type="submit"
            variant="primary"
            icon={<Search size={18} />}
          >
            Search
          </AnimatedButton>
        </form>
      </motion.div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-1">
            {tag ? `Posts tagged with #${tag}` : `Search results for "${query}"`}
          </h1>
          {!isLoading && (
            <p className="text-text-2 mt-1">
              Found {getTotalResults()} result{getTotalResults() !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 rounded-lg glass-card-subtle hover:bg-glass-low transition-colors"
        >
          <Filter size={20} className="text-text-2" />
        </motion.button>
      </div>

      {/* Search Type Tabs */}
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto">
        {searchTypes.map((type) => {
          const Icon = type.icon;
          const isActive = searchType === type.id;
          
          return (
            <motion.button
              key={type.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTypeChange(type.id as SearchType)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[var(--primary-violet)] text-white'
                  : 'glass-card-subtle text-text-2 hover:text-text-1'
              }`}
            >
              <Icon size={18} />
              <span className="font-medium">{type.label}</span>
              {!isLoading && (
                <span className={`text-sm ${isActive ? 'text-white/80' : 'text-text-2'}`}>
                  ({type.id === 'all' ? getTotalResults() :
                    type.id === 'posts' ? results.posts.length :
                    type.id === 'authors' ? results.authors.length :
                    results.tags.length})
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 size={32} className="text-[var(--primary-violet)]" />
          </motion.div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Posts Results */}
          {(searchType === 'all' || searchType === 'posts') && results.posts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {searchType === 'all' && (
                <h2 className="text-lg font-semibold text-text-1 mb-4 flex items-center">
                  <FileText size={20} className="mr-2 text-[var(--primary-blue)]" />
                  Posts
                </h2>
              )}
              <div className="space-y-4">
                {results.posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <PostCard post={post} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Authors Results */}
          {(searchType === 'all' || searchType === 'authors') && results.authors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {searchType === 'all' && (
                <h2 className="text-lg font-semibold text-text-1 mb-4 flex items-center">
                  <Users size={20} className="mr-2 text-[var(--primary-purple)]" />
                  Authors
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.authors.map((author) => (
                  <motion.div
                    key={author.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <AuthorCard author={author} variant="default" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tags Results */}
          {(searchType === 'all' || searchType === 'tags') && results.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {searchType === 'all' && (
                <h2 className="text-lg font-semibold text-text-1 mb-4 flex items-center">
                  <Hash size={20} className="mr-2 text-[var(--primary-teal)]" />
                  Tags
                </h2>
              )}
              <Card variant="prominent" className="p-6">
                <div className="flex flex-wrap gap-3">
                  {results.tags.map((tag) => (
                    <motion.button
                      key={tag.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/search?tag=${tag.name}`)}
                      className="px-4 py-2 rounded-full glass-card-subtle hover:bg-glass-low transition-all flex items-center space-x-2"
                    >
                      <Hash size={16} className="text-[var(--primary-teal)]" />
                      <span className="font-medium text-text-1">{tag.name}</span>
                      <span className="text-sm text-text-2">({tag.count})</span>
                    </motion.button>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* No Results */}
          {getTotalResults() === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <Card variant="prominent" className="inline-block p-12">
                <Search size={48} className="text-text-2 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-1 mb-2">
                  No results found
                </h3>
                <p className="text-text-2">
                  Try searching with different keywords or filters
                </p>
              </Card>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;