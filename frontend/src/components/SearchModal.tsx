import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, User, FileText, Hash, MessageSquare, Globe, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './context/ToastContext';
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
    hidden: { opacity: 0, scale: 0.95, y: -20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", duration: 0.3 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: -20,
      transition: { duration: 0.2 }
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
            className="search-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="search-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center p-4 border-b border-[var(--border-1)]">
              <Search size={24} className="text-[var(--text-2)] mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts, authors, or tags..."
                className="search-modal-input flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    onClose();
                  }
                }}
              />
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.1)] transition-colors"
              >
                <X size={20} className="text-[var(--text-2)]" />
              </button>
            </div>

            {isLoading && (
              <div className="p-8 text-center text-[var(--text-2)]">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-purple)]"></div>
              </div>
            )}

            {!isLoading && hasResults && (
              <div className="search-results-dropdown">
                {/* Posts */}
                {results.posts.length > 0 && (
                  <div className="p-4">
                    <h3 className="text-xs font-medium text-[var(--text-2)] uppercase mb-2">Posts</h3>
                    <div className="space-y-2">
                      {results.posts.map((post) => (
                        <motion.button
                          key={post.id}
                          onClick={() => handleResultClick('post', post.id)}
                          className="w-full p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] hover:bg-[rgba(var(--glass-rgb),0.1)] text-left transition-colors"
                          whileHover={{ x: 4 }}
                        >
                          <div className="flex items-start">
                            <FileText size={16} className="text-[var(--text-2)] mt-0.5 mr-3 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-[var(--text-1)] truncate">{post.title}</h4>
                              <p className="text-sm text-[var(--text-2)] truncate">
                                {typeof post.author === 'object' ? post.author.display_name : 'Unknown Author'}
                              </p>
                            </div>
                            <ArrowRight size={16} className="text-[var(--text-2)] ml-2 shrink-0" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {results.tags.length > 0 && (
                  <div className="p-4 border-t border-[var(--border-1)]">
                    <h3 className="text-xs font-medium text-[var(--text-2)] uppercase mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {results.tags.map((tag) => (
                        <motion.button
                          key={tag}
                          onClick={() => handleResultClick('tag', tag)}
                          className="px-3 py-1 rounded-full bg-[rgba(var(--glass-rgb),0.1)] hover:bg-[rgba(var(--glass-rgb),0.2)] text-sm text-[var(--text-1)] transition-colors"
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
              <div className="p-8 text-center text-[var(--text-2)]">
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-2">Try searching with different keywords</p>
              </div>
            )}

            {!query && (
              <div className="p-8 text-center text-[var(--text-2)]">
                <p className="text-sm">Type to start searching</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;