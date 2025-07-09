import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, HeartHandshake, FileText } from "lucide-react";
import { useAuth } from "../components/context/AuthContext";
import { api } from "../services/api";
import PostCard from "../components/PostCard";
import Loader from "../components/ui/Loader";
import AnimatedButton from "../components/ui/AnimatedButton";
import Card from "../components/ui/Card";
import type { Entry } from "../types/models";

export const LikedPostsPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Entry[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchLikedPosts = async (pageNum: number, append = false) => {
    if (!user) return;

    try {
      setIsLoadingMore(append);
      
      // Fetch liked posts for the current user
      const response = await api.getLikedEntries({
        page: pageNum,
        page_size: 10,
      });

      const newPosts = response.results;
      
      if (append) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      // Track liked post IDs
      const newLikedIds = new Set(likedPostIds);
      newPosts.forEach(post => newLikedIds.add(post.id));
      setLikedPostIds(newLikedIds);

      setHasMore(!!response.next);
    } catch (error) {
      console.error("Error fetching liked posts:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLikedPosts(1);
  }, [user]);

  const handleUnlikePost = (postId: string) => {
    // Remove from local state when unliked
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    setLikedPostIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      return newSet;
    });
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchLikedPosts(page + 1, true);
      setPage((prev) => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" message="Loading liked posts..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl flex flex-col flex-1">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-3">
          <motion.div
            className="w-12 h-12 rounded-full gradient-secondary flex items-center justify-center"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
            }}
            style={{
              background: "var(--gradient-secondary)",
              backgroundSize: "200% 200%",
            }}
          >
            <Heart className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-text-1">Liked Posts</h1>
            <p className="text-sm text-text-2">
              Posts you've shown love to
            </p>
          </div>
        </div>
      </motion.div>

      {/* Posts List */}
      <div className="flex-1 flex flex-col">
      {posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col"
        >
          <Card
            variant="main"
            className="text-center py-16 px-0 flex-1 flex flex-col justify-center w-full"
          >
            <div className="flex justify-center text-text-2 mb-4">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <HeartHandshake size={48} />
              </motion.div>
            </div>
            <h2 className="text-xl font-semibold text-text-1 mb-2">
              No liked posts yet
            </h2>
            <p className="text-text-2 mb-6 max-w-md mx-auto">
              Start exploring and show some love to posts you enjoy! 
              Your liked posts will appear here.
            </p>
            <AnimatedButton
              onClick={() => (window.location.href = "/explore")}
              variant="primary"
              className="max-w-xs mx-auto"
            >
              Explore Posts
            </AnimatedButton>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-6 flex-1">
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PostCard
                post={post}
                isLiked={likedPostIds.has(post.id)}
                onLike={(liked) => {
                  if (!liked) {
                    handleUnlikePost(post.id);
                  }
                }}
                onDelete={(postId) => handleUnlikePost(postId)}
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
                {posts.length} {posts.length === 1 ? "post" : "posts"} liked
              </span>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </div>
  );
};

export default LikedPostsPage;