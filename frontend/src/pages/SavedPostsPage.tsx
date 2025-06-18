import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, FileText } from "lucide-react";
import { useAuth } from "../components/context/AuthContext";
import { socialService } from "../services/social";
import PostCard from "../components/PostCard";
import Loader from "../components/ui/Loader";
import AnimatedButton from "../components/ui/AnimatedButton";
import Card from "../components/ui/Card";
import type { Entry } from "../types/models";

export const SavedPostsPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Entry[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchSavedPosts = async (pageNum: number, append = false) => {
    if (!user) return;

    try {
      setIsLoadingMore(append);
      const response = await socialService.getSavedPosts({
        page: pageNum,
        page_size: 10,
      });

      const newPosts = response.results;
      
      if (append) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      // Track saved post IDs
      const newSavedIds = new Set(savedPostIds);
      newPosts.forEach(post => newSavedIds.add(post.id));
      setSavedPostIds(newSavedIds);

      setHasMore(!!response.next);
    } catch (error) {
      console.error("Error fetching saved posts:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchSavedPosts(1);
  }, [user]);

  const handleUnsavePost = (postId: string) => {
    // Remove from local state when unsaved
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    setSavedPostIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      return newSet;
    });
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchSavedPosts(page + 1, true);
      setPage((prev) => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" message="Loading saved posts..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-3">
          <motion.div
            className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
            }}
            style={{
              background: "var(--gradient-primary)",
              backgroundSize: "200% 200%",
            }}
          >
            <BookmarkCheck className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-text-1">Saved Posts</h1>
            <p className="text-sm text-text-2">
              Your personal collection of saved posts
            </p>
          </div>
        </div>
      </motion.div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card
            variant="main"
            className="p-8 text-center bg-[rgba(var(--glass-rgb),0.4)] backdrop-blur-xl"
          >
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="inline-block mb-4"
            >
              <Bookmark size={48} className="text-text-2" />
            </motion.div>
            <h2 className="text-xl font-semibold text-text-1 mb-2">
              No saved posts yet
            </h2>
            <p className="text-text-2 mb-6 max-w-md mx-auto">
              Save posts you want to read later by clicking the bookmark icon on
              any post. They'll appear here for easy access.
            </p>
            <AnimatedButton
              onClick={() => (window.location.href = "/home")}
              variant="primary"
            >
              Explore Posts
            </AnimatedButton>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PostCard
                post={post}
                isSaved={savedPostIds.has(post.id)}
                onSave={(saved) => {
                  if (!saved) {
                    handleUnsavePost(post.id);
                  }
                }}
                onDelete={(postId) => handleUnsavePost(postId)}
              />
            </motion.div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center pt-6"
            >
              <AnimatedButton
                onClick={handleLoadMore}
                variant="secondary"
                size="lg"
                loading={isLoadingMore}
              >
                Load More
              </AnimatedButton>
            </motion.div>
          )}

          {/* Stats Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 pb-8 text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-text-2">
              <FileText size={16} />
              <span className="text-sm">
                {posts.length} {posts.length === 1 ? "post" : "posts"} saved
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SavedPostsPage;