import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, TrendingUp, Clock, User, Hash, 
  FileText, Loader2, ChevronRight, MessageCircle,
  Globe, ArrowRight, Heart
} from 'lucide-react';
// import type { Entry, Author } from '../types/models';
// import { api } from '../services/api';
import Avatar from './Avatar/Avatar';
import { debounce } from '../utils/debounce';

interface PostResult {
  id: string;
  title: string;
  author: string;
  excerpt?: string;
  timestamp: string;
  likes?: number;
  comments?: number;
}

interface AuthorResult {
  id: string;
  display_name: string;
  username: string;
  profile_image?: string;
  bio?: string;
  isFollowing?: boolean;
  isRemote?: boolean;
  node?: string;
}

interface CommentResult {
  id: string;
  content: string;
  author: string;
  postTitle: string;
  timestamp: string;
}

interface TagResult {
  name: string;
  count: number;
  trending?: boolean;
}

interface SearchResults {
  posts: PostResult[];
  authors: AuthorResult[];
  comments: CommentResult[];
  tags: TagResult[];
  remoteAuthors: AuthorResult[];
  hasMore: {
    posts: boolean;
    authors: boolean;
    comments: boolean;
    tags: boolean;
    remoteAuthors: boolean;
  };
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onClose?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  className = '',
  placeholder = 'Search posts, people, or tags...',
  autoFocus = false,
  onClose,
}) => {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    posts: [],
    authors: [],
    comments: [],
    tags: [],
    remoteAuthors: [],
    hasMore: {
      posts: false,
      authors: false,
      comments: false,
      tags: false,
      remoteAuthors: false,
    },
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<keyof SearchResults['hasMore'] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults({
          posts: [],
          authors: [],
          comments: [],
          tags: [],
          remoteAuthors: [],
          hasMore: {
            posts: false,
            authors: false,
            comments: false,
            tags: false,
            remoteAuthors: false,
          },
        });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        // Mock search results - replace with API calls
        const mockResults: SearchResults = {
          posts: [],
          authors: [],
          comments: [],
          tags: [],
          remoteAuthors: [],
          hasMore: {
            posts: false,
            authors: false,
            comments: false,
            tags: false,
            remoteAuthors: false,
          },
        };

        // Search posts
        if (searchQuery.length > 1) {
          mockResults.posts = [
            {
              id: '1',
              title: `Building ${searchQuery} with React`,
              author: 'John Doe',
              excerpt: 'A comprehensive guide to building modern web applications...',
              timestamp: '2 hours ago',
              likes: 24,
              comments: 5,
            },
            {
              id: '2',
              title: `Understanding ${searchQuery} in depth`,
              author: 'Jane Smith',
              excerpt: 'Deep dive into the core concepts and best practices...',
              timestamp: '1 day ago',
              likes: 18,
              comments: 3,
            }
          ];
          mockResults.hasMore.posts = true;
        }

        // Search authors
        if (searchQuery.length > 0) {
          mockResults.authors = [
            {
              id: '101',
              display_name: `${searchQuery.charAt(0).toUpperCase()}${searchQuery.slice(1)} User`,
              username: `${searchQuery.toLowerCase()}user`,
              profile_image: `https://i.pravatar.cc/150?u=${searchQuery}`,
              bio: 'Software developer passionate about open source',
              isFollowing: false,
            }
          ];
        }

        // Search comments
        if (searchQuery.length > 2) {
          mockResults.comments = [
            {
              id: 'c1',
              content: `I agree with the point about ${searchQuery}...`,
              author: 'Alex Chen',
              postTitle: 'Modern Web Development Practices',
              timestamp: '5 hours ago',
            }
          ];
        }

        // Search tags
        if (searchQuery.startsWith('#')) {
          const tagQuery = searchQuery.slice(1);
          if (tagQuery) {
            mockResults.tags = [
              {
                name: tagQuery.toLowerCase(),
                count: 42,
                trending: true,
              },
              {
                name: `${tagQuery.toLowerCase()}-development`,
                count: 15,
              }
            ];
          }
        } else if (searchQuery.length > 0) {
          mockResults.tags = [{
            name: searchQuery.toLowerCase(),
            count: 8,
          }];
        }

        // Search remote authors
        if (searchQuery.length > 3) {
          mockResults.remoteAuthors = [
            {
              id: 'r1',
              display_name: `${searchQuery} from Remote`,
              username: `${searchQuery.toLowerCase()}@remote.node`,
              profile_image: `https://i.pravatar.cc/150?u=${searchQuery}-remote`,
              isRemote: true,
              node: 'remote.node.com',
            }
          ];
        }

        setResults(mockResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults({
          posts: [],
          authors: [],
          comments: [],
          tags: [],
          remoteAuthors: [],
          hasMore: {
            posts: false,
            authors: false,
            comments: false,
            tags: false,
            remoteAuthors: false,
          },
        });
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Handle search input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    
    if (value.trim()) {
      performSearch(value);
    } else {
      setResults({
        posts: [],
        authors: [],
        comments: [],
        tags: [],
        remoteAuthors: [],
        hasMore: {
          posts: false,
          authors: false,
          comments: false,
          tags: false,
          remoteAuthors: false,
        },
      });
      setIsSearching(false);
    }
  };

  // Get total results count
  const getTotalResults = () => {
    return results.posts.length + 
           results.authors.length + 
           results.comments.length + 
           results.tags.length + 
           results.remoteAuthors.length;
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const sections: (keyof SearchResults['hasMore'])[] = ['posts', 'authors', 'comments', 'tags', 'remoteAuthors'];
    const totalResults = getTotalResults();
    
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        if (totalResults === 0) return;
        
        // Navigation logic for sections
        let newIndex = selectedIndex;
        let newSection = selectedSection;
        
        if (e.key === 'ArrowDown') {
          if (selectedSection === null || selectedIndex === -1) {
            // Find first non-empty section
            for (const section of sections) {
              const sectionResults = results[section];
              if (Array.isArray(sectionResults) && sectionResults.length > 0) {
                newSection = section;
                newIndex = 0;
                break;
              }
            }
          } else {
            const sectionKey = selectedSection as keyof Omit<SearchResults, 'hasMore'>;
            const currentSectionItems = results[sectionKey] as any[];
            if (currentSectionItems && selectedIndex < currentSectionItems.length - 1) {
              newIndex = selectedIndex + 1;
            } else {
              // Move to next non-empty section
              const currentSectionIndex = sections.indexOf(selectedSection);
              for (let i = currentSectionIndex + 1; i < sections.length; i++) {
                const nextSectionKey = sections[i] as keyof Omit<SearchResults, 'hasMore'>;
                const nextSectionItems = results[nextSectionKey] as any[];
                if (nextSectionItems && nextSectionItems.length > 0) {
                  newSection = sections[i];
                  newIndex = 0;
                  break;
                }
              }
            }
          }
        } else { // ArrowUp
          if (selectedSection && selectedIndex > 0) {
            newIndex = selectedIndex - 1;
          } else if (selectedSection) {
            // Move to previous non-empty section
            const currentSectionIndex = sections.indexOf(selectedSection);
            for (let i = currentSectionIndex - 1; i >= 0; i--) {
              const prevSectionKey = sections[i] as keyof Omit<SearchResults, 'hasMore'>;
              const sectionItems = results[prevSectionKey] as any[];
              if (sectionItems && sectionItems.length > 0) {
                newSection = sections[i];
                newIndex = sectionItems.length - 1;
                break;
              }
            }
          }
        }
        
        setSelectedSection(newSection);
        setSelectedIndex(newIndex);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedSection && selectedIndex >= 0) {
          const sectionKey = selectedSection as keyof Omit<SearchResults, 'hasMore'>;
          const items = results[sectionKey] as any[];
          if (items && items[selectedIndex]) {
            handleSelectResult(selectedSection, items[selectedIndex]);
          }
        } else if (query) {
          // Perform general search
          navigate(`/search?q=${encodeURIComponent(query)}`);
          handleClose();
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        if (query) {
          setQuery('');
          setResults({
            posts: [],
            authors: [],
            comments: [],
            tags: [],
            remoteAuthors: [],
            hasMore: {
              posts: false,
              authors: false,
              comments: false,
              tags: false,
              remoteAuthors: false,
            },
          });
        } else {
          handleClose();
        }
        break;
    }
  };

  // Handle selecting a search result
  const handleSelectResult = (type: keyof SearchResults['hasMore'], item: any) => {
    // Save to recent searches
    const searchTerm = query.trim();
    if (searchTerm && !recentSearches.includes(searchTerm)) {
      const newRecent = [searchTerm, ...recentSearches.filter(r => r !== searchTerm)].slice(0, 10);
      setRecentSearches(newRecent);
      localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    }

    // Navigate based on result type
    switch (type) {
      case 'posts':
        navigate(`/posts/${item.id}`);
        break;
      case 'authors':
      case 'remoteAuthors':
        navigate(`/authors/${item.id}`);
        break;
      case 'tags':
        navigate(`/search?tag=${encodeURIComponent(item.name)}`);
        break;
      case 'comments':
        // Navigate to the post containing the comment
        navigate(`/posts/${item.id}#comment-${item.id}`);
        break;
    }

    handleClose();
  };

  // Handle quick actions
  const handleQuickAction = (e: React.MouseEvent, _type: keyof SearchResults['hasMore'], item: any, action: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    switch (action) {
      case 'follow':
        // TODO: Implement follow/unfollow
        console.log('Follow:', item);
        break;
      case 'like':
        // TODO: Implement like
        console.log('Like:', item);
        break;
      case 'save':
        // TODO: Implement save
        console.log('Save:', item);
        break;
    }
  };

  // Handle closing the search
  const handleClose = () => {
    setQuery('');
    setResults({
      posts: [],
      authors: [],
      comments: [],
      tags: [],
      remoteAuthors: [],
      hasMore: {
        posts: false,
        authors: false,
        comments: false,
        tags: false,
        remoteAuthors: false,
      },
    });
    setIsOpen(false);
    setSelectedSection(null);
    setSelectedIndex(-1);
    onClose?.();
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Handle selecting recent search
  const handleRecentSearch = (search: string) => {
    setQuery(search);
    performSearch(search);
  };

  const hasResults = getTotalResults() > 0;

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <motion.div
          animate={{ scale: isOpen ? 1.02 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full pl-10 pr-10 py-3 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-[var(--primary-violet)] focus:border-transparent transition-all duration-200"
          />
        </motion.div>
        
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <Search size={18} className="text-text-2" />
        </div>
        
        {/* Clear/Close Button */}
        {(query || isSearching) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setQuery('');
              setResults({
                posts: [],
                authors: [],
                comments: [],
                tags: [],
                remoteAuthors: [],
                hasMore: {
                  posts: false,
                  authors: false,
                  comments: false,
                  tags: false,
                  remoteAuthors: false,
                },
              });
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-glass-low transition-colors"
          >
            {isSearching ? (
              <Loader2 size={16} className="text-text-2 animate-spin" />
            ) : (
              <X size={16} className="text-text-2" />
            )}
          </motion.button>
        )}
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 glass-card-prominent rounded-lg shadow-xl overflow-hidden z-50 max-w-2xl"
          >
            {!query ? (
              // Recent/Trending Searches
              <div>
                {recentSearches.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border-1">
                      <span className="text-sm font-medium text-text-2">Recent Searches</span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-text-2 hover:text-text-1 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="p-2">
                      {recentSearches.map((search, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleRecentSearch(search)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-glass-low transition-colors flex items-center space-x-2 group"
                        >
                          <Clock size={16} className="text-text-2" />
                          <span className="flex-1 text-text-1">{search}</span>
                          <ChevronRight size={16} className="text-text-2 opacity-0 group-hover:opacity-100" />
                        </motion.button>
                      ))}
                    </div>
                  </>
                ) : (
                  // Trending searches
                  <div className="p-4">
                    <div className="flex items-center space-x-2 text-sm font-medium text-text-2 mb-3">
                      <TrendingUp size={16} />
                      <span>Trending</span>
                    </div>
                    <div className="space-y-2">
                      {['React 19', 'TypeScript', 'Web3', 'AI'].map((trend, index) => (
                        <motion.button
                          key={trend}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => {
                            setQuery(trend);
                            performSearch(trend);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-glass-low transition-colors flex items-center justify-between group"
                        >
                          <span className="text-text-1">{trend}</span>
                          <ChevronRight size={16} className="text-text-2 group-hover:text-text-1" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Search Results
              <div className="max-h-[480px] overflow-y-auto">
                {hasResults ? (
                  <>
                    {/* Posts Section */}
                    {results.posts.length > 0 && (
                      <div className="border-b border-border-1 last:border-0">
                        <div className="px-4 py-2 bg-glass-low sticky top-0 z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText size={16} className="text-[var(--primary-blue)]" />
                              <span className="text-sm font-medium text-text-1">Posts</span>
                              <span className="text-xs text-text-2">({results.posts.length})</span>
                            </div>
                            {results.hasMore.posts && (
                              <button
                                onClick={() => navigate(`/search?q=${encodeURIComponent(query)}&type=posts`)}
                                className="text-xs text-[var(--primary-violet)] hover:underline"
                              >
                                View all
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          {results.posts.map((post, index) => {
                            const isSelected = selectedSection === 'posts' && selectedIndex === index;
                            return (
                              <motion.div
                                key={post.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.02 }}
                                onClick={() => handleSelectResult('posts', post)}
                                onMouseEnter={() => {
                                  setSelectedSection('posts');
                                  setSelectedIndex(index);
                                }}
                                className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-glass-low ${
                                  isSelected ? 'bg-glass-low' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-text-1 line-clamp-1">{post.title}</h4>
                                    <p className="text-xs text-text-2 mt-1">
                                      by {post.author} • {post.timestamp}
                                    </p>
                                    {post.excerpt && (
                                      <p className="text-sm text-text-2 mt-1 line-clamp-2">{post.excerpt}</p>
                                    )}
                                    <div className="flex items-center space-x-4 mt-2">
                                      <span className="text-xs text-text-2 flex items-center space-x-1">
                                        <Heart size={12} />
                                        <span>{post.likes || 0}</span>
                                      </span>
                                      <span className="text-xs text-text-2 flex items-center space-x-1">
                                        <MessageCircle size={12} />
                                        <span>{post.comments || 0}</span>
                                      </span>
                                    </div>
                                  </div>
                                  <ChevronRight size={16} className="text-text-2 mt-1 ml-2" />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Authors Section */}
                    {results.authors.length > 0 && (
                      <div className="border-b border-border-1 last:border-0">
                        <div className="px-4 py-2 bg-glass-low sticky top-0 z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <User size={16} className="text-[var(--primary-pink)]" />
                              <span className="text-sm font-medium text-text-1">Authors</span>
                              <span className="text-xs text-text-2">({results.authors.length})</span>
                            </div>
                            {results.hasMore.authors && (
                              <button
                                onClick={() => navigate(`/search?q=${encodeURIComponent(query)}&type=authors`)}
                                className="text-xs text-[var(--primary-violet)] hover:underline"
                              >
                                View all
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          {results.authors.map((author, index) => {
                            const isSelected = selectedSection === 'authors' && selectedIndex === index;
                            return (
                              <motion.div
                                key={author.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.02 }}
                                onClick={() => handleSelectResult('authors', author)}
                                onMouseEnter={() => {
                                  setSelectedSection('authors');
                                  setSelectedIndex(index);
                                }}
                                className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-glass-low ${
                                  isSelected ? 'bg-glass-low' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <Avatar
                                      imgSrc={author.profile_image}
                                      alt={author.display_name}
                                      size="md"
                                    />
                                    <div>
                                      <h4 className="font-medium text-text-1">{author.display_name}</h4>
                                      <p className="text-xs text-text-2">@{author.username}</p>
                                      {author.bio && (
                                        <p className="text-xs text-text-2 mt-1 line-clamp-1">{author.bio}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {!author.isFollowing && (
                                      <button
                                        onClick={(e) => handleQuickAction(e, 'authors', author, 'follow')}
                                        className="px-3 py-1 text-xs rounded-full bg-[var(--primary-violet)] text-white hover:opacity-80 transition-opacity"
                                      >
                                        Follow
                                      </button>
                                    )}
                                    <ChevronRight size={16} className="text-text-2" />
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tags Section */}
                    {results.tags.length > 0 && (
                      <div className="border-b border-border-1 last:border-0">
                        <div className="px-4 py-2 bg-glass-low sticky top-0 z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Hash size={16} className="text-[var(--primary-teal)]" />
                              <span className="text-sm font-medium text-text-1">Tags</span>
                              <span className="text-xs text-text-2">({results.tags.length})</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          {results.tags.map((tag, index) => {
                            const isSelected = selectedSection === 'tags' && selectedIndex === index;
                            return (
                              <motion.div
                                key={tag.name}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.02 }}
                                onClick={() => handleSelectResult('tags', tag)}
                                onMouseEnter={() => {
                                  setSelectedSection('tags');
                                  setSelectedIndex(index);
                                }}
                                className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-glass-low flex items-center justify-between ${
                                  isSelected ? 'bg-glass-low' : ''
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 rounded-lg bg-[var(--primary-teal)]/10 flex items-center justify-center">
                                    <Hash size={18} className="text-[var(--primary-teal)]" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-text-1">#{tag.name}</h4>
                                    <p className="text-xs text-text-2">
                                      {tag.count} posts {tag.trending && '• Trending'}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight size={16} className="text-text-2" />
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Comments Section */}
                    {results.comments.length > 0 && (
                      <div className="border-b border-border-1 last:border-0">
                        <div className="px-4 py-2 bg-glass-low sticky top-0 z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <MessageCircle size={16} className="text-[var(--primary-purple)]" />
                              <span className="text-sm font-medium text-text-1">Comments</span>
                              <span className="text-xs text-text-2">({results.comments.length})</span>
                            </div>
                            {results.hasMore.comments && (
                              <button
                                onClick={() => navigate(`/search?q=${encodeURIComponent(query)}&type=comments`)}
                                className="text-xs text-[var(--primary-violet)] hover:underline"
                              >
                                View all
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          {results.comments.map((comment, index) => {
                            const isSelected = selectedSection === 'comments' && selectedIndex === index;
                            return (
                              <motion.div
                                key={comment.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.02 }}
                                onClick={() => handleSelectResult('comments', comment)}
                                onMouseEnter={() => {
                                  setSelectedSection('comments');
                                  setSelectedIndex(index);
                                }}
                                className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-glass-low ${
                                  isSelected ? 'bg-glass-low' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm text-text-1 line-clamp-2">{comment.content}</p>
                                    <p className="text-xs text-text-2 mt-1">
                                      {comment.author} on "{comment.postTitle}" • {comment.timestamp}
                                    </p>
                                  </div>
                                  <ChevronRight size={16} className="text-text-2 mt-1 ml-2" />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Remote Authors Section */}
                    {results.remoteAuthors.length > 0 && (
                      <div className="border-b border-border-1 last:border-0">
                        <div className="px-4 py-2 bg-glass-low sticky top-0 z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Globe size={16} className="text-[var(--primary-coral)]" />
                              <span className="text-sm font-medium text-text-1">Remote Authors</span>
                              <span className="text-xs text-text-2">({results.remoteAuthors.length})</span>
                            </div>
                            {results.hasMore.remoteAuthors && (
                              <button
                                onClick={() => navigate(`/search?q=${encodeURIComponent(query)}&type=remote`)}
                                className="text-xs text-[var(--primary-violet)] hover:underline"
                              >
                                View all
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          {results.remoteAuthors.map((author, index) => {
                            const isSelected = selectedSection === 'remoteAuthors' && selectedIndex === index;
                            return (
                              <motion.div
                                key={author.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.02 }}
                                onClick={() => handleSelectResult('remoteAuthors', author)}
                                onMouseEnter={() => {
                                  setSelectedSection('remoteAuthors');
                                  setSelectedIndex(index);
                                }}
                                className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-glass-low ${
                                  isSelected ? 'bg-glass-low' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <Avatar
                                      imgSrc={author.profile_image}
                                      alt={author.display_name}
                                      size="md"
                                    />
                                    <div>
                                      <h4 className="font-medium text-text-1">{author.display_name}</h4>
                                      <p className="text-xs text-text-2">
                                        @{author.username} • 
                                        <span className="text-[var(--primary-coral)]">{author.node}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={(e) => handleQuickAction(e, 'remoteAuthors', author, 'follow')}
                                      className="px-3 py-1 text-xs rounded-full bg-[var(--primary-coral)] text-white hover:opacity-80 transition-opacity"
                                    >
                                      Connect
                                    </button>
                                    <ChevronRight size={16} className="text-text-2" />
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // No results
                  <div className="p-8 text-center">
                    <Search size={32} className="text-text-2 mx-auto mb-2" />
                    <p className="text-sm text-text-2">No results found for "{query}"</p>
                  </div>
                )}

                {/* See All Results Footer */}
                {hasResults && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                      navigate(`/search?q=${encodeURIComponent(query)}`);
                      handleClose();
                    }}
                    className="w-full px-4 py-3 border-t border-border-1 text-center text-sm font-medium flex items-center justify-center space-x-2 hover:bg-glass-low transition-colors group"
                  >
                    <span className="text-[var(--primary-violet)]">Find out more</span>
                    <ArrowRight size={16} className="text-[var(--primary-violet)] transform group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;