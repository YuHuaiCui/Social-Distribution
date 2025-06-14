import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, User, FileText, Hash, MessageSquare, Globe, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './context/ToastContext';
import Input from './ui/Input';
import Card from './ui/Card';
import type { Entry, Author, Comment } from '../types/models';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResults {
  posts: Entry[];
  authors: Author[];
  comments: Comment[];
  tags: string[];
  remoteResults: any[];
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      // Mock search results - replace with actual API calls
      const mockResults: SearchResults = {
        posts: [
          {
            id: '1',
            url: '/posts/1',
            title: 'Introduction to React Hooks',
            content: 'Learn about React hooks...',
            content_type: 'text/markdown',
            visibility: 'public',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            author: {
              id: '1',
              url: '/authors/1',
              username: 'john_doe',
              email: 'john@example.com',
              display_name: 'John Doe',
              bio: 'Software Developer',
              is_approved: true,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          }
        ].filter(post => post.title.toLowerCase().includes(searchQuery.toLowerCase())),
        authors: [],
        comments: [],
        tags: ['react', 'javascript', 'typescript'].filter(tag => 
          tag.includes(searchQuery.toLowerCase())
        ),
        remoteResults: []
      };

      setResults(mockResults);
    } catch (error) {
      showError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (type: string, id: string) => {
    onClose();
    setQuery('');
    setResults(null);

    switch (type) {
      case 'post':
        navigate(`/posts/${id}`);
        break;
      case 'author':
        navigate(`/authors/${id}`);
        break;
      case 'tag':
        navigate(`/explore?tag=${id}`);
        break;
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        damping: 25,
        stiffness: 300,
        duration: 0.4 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: 20,
      transition: { duration: 0.3 }
    }
  };

  const hasResults = results && (
    results.posts.length > 0 ||
    results.authors.length > 0 ||
    results.comments.length > 0 ||
    results.tags.length > 0 ||
    results.remoteResults.length > 0
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[300]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          
          <motion.div
            className="fixed inset-0 z-[310] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-2xl mx-4 pointer-events-auto"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                {/* Glass morphism search container */}
                <div className="bg-[rgba(var(--glass-rgb),var(--glass-alpha-high))] backdrop-blur-2xl rounded-2xl border border-[var(--glass-border-prominent)] shadow-2xl overflow-hidden">
                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-[rgba(var(--glass-rgb),0.1)] hover:bg-[rgba(var(--glass-rgb),0.2)] transition-all z-10"
                  >
                    <X size={18} className="text-[var(--text-2)]" />
                  </button>
                  
                  {/* Search Input Container */}
                  <div className="p-8 pb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-yellow)]/20 via-[var(--primary-pink)]/20 to-[var(--primary-purple)]/20 rounded-xl blur-xl" />
                      <div className="relative">
                        <Search size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-2)] pointer-events-none" />
                        <input
                          ref={inputRef}
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search posts, authors, or tags..."
                          className="w-full pl-14 pr-5 py-5 text-lg bg-[rgba(var(--glass-rgb),0.5)] backdrop-blur-md border border-[var(--glass-border)] rounded-xl text-[var(--text-1)] placeholder:text-[var(--text-2)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-purple)]/50 focus:border-[var(--primary-purple)]/50 transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              onClose();
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Popular searches - shown when no query */}
                    {!query && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex flex-wrap gap-2"
                      >
                        <span className="text-xs text-[var(--text-2)] mr-2">Popular:</span>
                        {['React', 'TypeScript', 'Distributed Systems', 'CMPUT404'].map((suggestion, index) => (
                          <motion.button
                            key={suggestion}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setQuery(suggestion)}
                            className="px-3 py-1 text-xs rounded-full bg-gradient-to-r from-[var(--primary-yellow)]/10 via-[var(--primary-pink)]/10 to-[var(--primary-purple)]/10 hover:from-[var(--primary-yellow)]/20 hover:via-[var(--primary-pink)]/20 hover:to-[var(--primary-purple)]/20 text-[var(--text-1)] border border-[var(--glass-border)] transition-all"
                          >
                            {suggestion}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Results or States */}
                  <div className="max-h-[40vh] overflow-y-auto border-t border-[var(--glass-border)]">
                  {isLoading && (
                    <div className="p-8 text-center">
                      <div className="inline-flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-[var(--primary-purple)] border-t-transparent animate-spin" />
                      </div>
                      <p className="mt-3 text-sm text-[var(--text-2)]">Searching...</p>
                    </div>
                  )}

                  {!isLoading && hasResults && (
                    <div>
                      {/* Posts */}
                      {results.posts.length > 0 && (
                        <div className="p-4">
                          <h3 className="text-xs font-medium text-[var(--text-2)] uppercase tracking-wider mb-3">
                            Posts
                          </h3>
                          <div className="space-y-2">
                            {results.posts.map((post) => (
                              <motion.button
                                key={post.id}
                                onClick={() => handleResultClick('post', post.id)}
                                className="w-full p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] hover:bg-[rgba(var(--glass-rgb),0.5)] text-left transition-all group"
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center">
                                  <FileText size={16} className="text-[var(--primary-purple)] mr-3 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-[var(--text-1)] truncate group-hover:text-[var(--primary-purple)] transition-colors">
                                      {post.title}
                                    </h4>
                                    <p className="text-xs text-[var(--text-2)] truncate">
                                      {typeof post.author === 'object' ? post.author.display_name : 'Unknown Author'}
                                    </p>
                                  </div>
                                  <ArrowRight size={14} className="text-[var(--text-2)] ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {results.tags.length > 0 && (
                        <div className="p-4 border-t border-[var(--glass-border)]">
                          <h3 className="text-xs font-medium text-[var(--text-2)] uppercase tracking-wider mb-3">
                            Tags
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {results.tags.map((tag, index) => (
                              <motion.button
                                key={tag}
                                onClick={() => handleResultClick('tag', tag)}
                                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[var(--primary-purple)]/10 to-[var(--primary-pink)]/10 hover:from-[var(--primary-purple)]/20 hover:to-[var(--primary-pink)]/20 text-sm text-[var(--text-1)] border border-[var(--glass-border)] transition-all"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Hash size={12} className="inline mr-1" />
                                {tag}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!isLoading && query && !hasResults && (
                    <div className="p-8 text-center">
                      <Search size={32} className="text-[var(--text-2)] mx-auto mb-4 opacity-50" />
                      <p className="text-[var(--text-1)] font-medium">No results found</p>
                      <p className="text-sm text-[var(--text-2)] mt-1">Try searching with different keywords</p>
                    </div>
                  )}
                  </div>
                </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;