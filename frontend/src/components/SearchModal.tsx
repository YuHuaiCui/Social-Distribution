import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Hash, ArrowRight, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { api } from "../services/api";
import AnimatedGradient from "./ui/AnimatedGradient";
import type { Entry, Author, Comment } from "../types/models";
import { useAuth } from "./context/AuthContext"; // adjust path as needed
import { extractUUID, getAuthorUrl, isRemoteAuthor } from "../utils/extractId";

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
  const showError = (message: string) =>
    console.error("Search error:", message);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const isAdmin = user?.is_staff || user?.is_superuser;

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
      console.log("Triggering search for query:", query);
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
      const searchResults: SearchResults = {
        posts: [],
        authors: [],
        comments: [],
        tags: [],
        remoteResults: [],
      };

      // Search authors
      if (searchQuery.trim()) {
        try {
          const authorsResponse = await api.getAuthors({
            search: searchQuery,
            // Don't filter by is_active to include remote authors (they have is_active=False)
            // Remove type filtering to include both local and remote authors
            ...(isAdmin ? {} : { is_approved: true }),
          });
          // Handle both paginated and direct array responses
          searchResults.authors =
            authorsResponse.results || authorsResponse.authors || authorsResponse || [];
          console.log("Parsed search results:", searchResults.authors.length, "authors found");
        } catch (error) {
          console.error("Error searching authors:", error);
        }
      }

      // TODO: Search posts when backend entry search is implemented
      // TODO: Search tags when tag system is implemented

      console.log("Setting search results:", searchResults);
      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      showError("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (type: string, id: string) => {
    onClose();
    setQuery("");
    setResults(null);

    switch (type) {
      case "post":
        navigate(`/posts/${id}`);
        break;
      case "author":
        // For author navigation, we need the author object to determine the correct URL
        // Find the author from the current results
        const author = results?.authors.find(a => a.id === id);
        if (author) {
          navigate(getAuthorUrl(author));
        } else {
          // Fallback to UUID extraction for backwards compatibility
          navigate(`/authors/${extractUUID(id)}`);
        }
        break;
      case "tag":
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
        type: "spring" as const,
        damping: 25,
        stiffness: 300,
        duration: 0.4,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: { duration: 0.3 },
    },
  };

  const hasResults =
    results &&
    (results.posts.length > 0 ||
      results.authors.length > 0 ||
      results.comments.length > 0 ||
      results.tags.length > 0 ||
      results.remoteResults.length > 0);

  console.log("hasResults:", hasResults, "results:", results);

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
              {/* Popular searches - above search bar */}
              {!query && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-3 mb-6"
                >
                  <span className="text-sm font-medium text-white/90 drop-shadow-lg">
                    Popular:
                  </span>
                  {[
                    "React",
                    "TypeScript",
                    "Distributed Systems",
                    "CMPUT404",
                  ].map((suggestion, index) => {
                    const gradientSets = [
                      [
                        "var(--primary-yellow)",
                        "var(--primary-pink)",
                        "var(--primary-purple)",
                      ],
                      [
                        "var(--primary-teal)",
                        "var(--primary-blue)",
                        "var(--primary-purple)",
                      ],
                      [
                        "var(--primary-coral)",
                        "var(--primary-violet)",
                        "var(--primary-pink)",
                      ],
                      [
                        "var(--primary-purple)",
                        "var(--primary-teal)",
                        "var(--primary-yellow)",
                      ],
                    ];

                    return (
                      <motion.div
                        key={suggestion}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <AnimatedGradient
                          gradientColors={gradientSets[index]}
                          className="px-4 py-2 text-sm font-medium rounded-full shadow-lg hover:shadow-xl cursor-pointer"
                          textClassName="text-white font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                          duration={15}
                          onClick={() => setQuery(suggestion)}
                        >
                          {suggestion}
                        </AnimatedGradient>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {/* Glassmorphic search bar */}
              <div className="relative mb-8">
                <Search
                  size={24}
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-2)] pointer-events-none z-10"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search posts, authors, or tags..."
                  className="w-full pl-16 pr-6 py-6 text-lg bg-[rgba(var(--glass-rgb),0.6)] backdrop-blur-2xl border-2 border-[var(--glass-border-prominent)] rounded-full text-[var(--text-1)] placeholder:text-[var(--text-2)] focus:outline-none focus:ring-4 focus:ring-[var(--primary-purple)]/30 focus:border-[var(--primary-purple)]/50 transition-all shadow-xl"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      onClose();
                    }
                  }}
                />
              </div>

              {/* Results or States */}
              {(isLoading || hasResults || (query && !hasResults)) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[rgba(var(--glass-rgb),0.95)] backdrop-blur-2xl rounded-2xl border border-[var(--glass-border-prominent)] shadow-xl max-h-[40vh] overflow-y-auto"
                >
                  {isLoading && (
                    <div className="p-8 text-center">
                      <div className="inline-flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-[var(--primary-purple)] border-t-transparent animate-spin" />
                      </div>
                      <p className="mt-3 text-sm text-[var(--search-results-secondary)]">
                        Searching...
                      </p>
                    </div>
                  )}

                  {!isLoading && hasResults && (
                    <div>
                      {/* Authors */}
                      {results.authors.length > 0 && (
                        <div className="p-4">
                          {console.log("Rendering authors section with", results.authors.length, "authors")}
                          <h3 className="text-xs font-medium text-[var(--search-results-secondary)] uppercase tracking-wider mb-3">
                            Authors
                          </h3>
                          <div className="space-y-2">
                            {results.authors.map((author) => (
                              <motion.button
                                key={author.id}
                                onClick={() =>
                                  handleResultClick("author", author.id)
                                }
                                className="w-full p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] hover:bg-[rgba(var(--glass-rgb),0.5)] text-left transition-all group"
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-purple)] to-[var(--primary-pink)] flex items-center justify-center text-white font-semibold text-sm mr-3 shrink-0">
                                    {(author.displayName || author.display_name)
                                      ?.charAt(0)
                                      .toUpperCase() || "U"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-[var(--search-results-primary)] truncate group-hover:text-[var(--search-results-accent)] transition-colors flex items-center gap-1">
                                      {author.displayName || author.display_name || "Unknown Author"}
                                      {isRemoteAuthor(author) && (
                                        <Globe size={12} className="text-blue-400 shrink-0" title="Remote Author" />
                                      )}
                                    </h4>
                                  </div>
                                  <ArrowRight
                                    size={14}
                                    className="text-[var(--search-results-secondary)] ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  />
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Posts */}
                      {results.posts.length > 0 && (
                        <div className="p-4 border-t border-[var(--glass-border)]">
                          <h3 className="text-xs font-medium text-[var(--search-results-secondary)] uppercase tracking-wider mb-3">
                            Posts
                          </h3>
                          <div className="space-y-2">
                            {results.posts.map((post) => (
                              <motion.button
                                key={post.id}
                                onClick={() =>
                                  handleResultClick("post", post.id)
                                }
                                className="w-full p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] hover:bg-[rgba(var(--glass-rgb),0.5)] text-left transition-all group"
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center">
                                  <FileText
                                    size={16}
                                    className="text-[var(--primary-purple)] mr-3 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-[var(--search-results-primary)] truncate group-hover:text-[var(--search-results-accent)] transition-colors">
                                      {post.title}
                                    </h4>
                                    <p className="text-xs text-[var(--search-results-secondary)] truncate">
                                      {typeof post.author === "object"
                                        ? post.author.displayName || post.author.display_name
                                        : "Unknown Author"}
                                    </p>
                                  </div>
                                  <ArrowRight
                                    size={14}
                                    className="text-[var(--search-results-secondary)] ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  />
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {results.tags.length > 0 && (
                        <div className="p-4 border-t border-[var(--glass-border)]">
                          <h3 className="text-xs font-medium text-[var(--search-results-secondary)] uppercase tracking-wider mb-3">
                            Tags
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {results.tags.map((tag, index) => (
                              <motion.button
                                key={tag}
                                onClick={() => handleResultClick("tag", tag)}
                                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[var(--primary-purple)]/10 to-[var(--primary-pink)]/10 hover:from-[var(--primary-purple)]/20 hover:to-[var(--primary-pink)]/20 text-sm text-[var(--search-results-primary)] font-medium border border-[var(--glass-border)] transition-all"
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
                      <Search
                        size={32}
                        className="text-[var(--search-results-secondary)] mx-auto mb-4 opacity-50"
                      />
                      <p className="text-[var(--search-results-primary)] font-medium">
                        No results found
                      </p>
                      <p className="text-sm text-[var(--search-results-secondary)] mt-1">
                        Try searching with different keywords
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
