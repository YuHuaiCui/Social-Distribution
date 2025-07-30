import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "./context/AuthContext";

interface RightSidebarProps {}

interface UserStats {
  posts: number;
  followers: number;
  following: number;
}

const RightSidebar: React.FC<RightSidebarProps> = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    posts: 0,
    followers: 0,
    following: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUserStats = useCallback(async () => {
    if (!user?.id) {
      setIsLoadingStats(false);
      return;
    }

    try {
      if (!isRefreshing) {
        setIsLoadingStats(true);
      }

      // Fetch real stats from the API
      const [followers, following, entries] = await Promise.all([
        api.getFollowers(user.id),
        api.getFollowing(user.id),
        api.getAuthorEntries(user.id),
      ]);

      setStats({
        posts: entries.length,
        followers: followers.length,
        following: following.length,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      // Keep default values on error
    } finally {
      setIsLoadingStats(false);
      setIsRefreshing(false);
    }
  }, [user?.id, isRefreshing]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  // Listen for post creation events to update stats
  useEffect(() => {
    const handlePostCreated = () => {
      // Refresh stats when a new post is created
      fetchUserStats();
    };

    const handleFollowUpdate = () => {
      // Refresh stats when follow status changes
      fetchUserStats();
    };

    window.addEventListener("post-created", handlePostCreated);
    window.addEventListener("follow-update", handleFollowUpdate);

    return () => {
      window.removeEventListener("post-created", handlePostCreated);
      window.removeEventListener("follow-update", handleFollowUpdate);
    };
  }, [fetchUserStats]);

  return (
    <aside className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-24 space-y-6">

        {/* Quick Stats */}
        <div className="rounded-2xl border border-border-1 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[color:var(--text-2)] text-sm font-medium">
              Your Stats
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsRefreshing(true);
                fetchUserStats();
              }}
              disabled={isLoadingStats || isRefreshing}
              className="text-[color:var(--text-2)] hover:text-[color:var(--text-1)] transition-colors disabled:opacity-50"
              title="Refresh stats"
            >
              <motion.div
                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={{
                  duration: 1,
                  repeat: isRefreshing ? Infinity : 0,
                  ease: "linear",
                }}
              >
                <RefreshCw size={14} />
              </motion.div>
            </motion.button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[color:var(--text-2)]">Posts</span>
              <span
                className={`text-sm font-medium text-[color:var(--text-1)] transition-opacity ${
                  isLoadingStats && !isRefreshing ? "opacity-50" : ""
                }`}
              >
                {isLoadingStats && !isRefreshing ? "..." : stats.posts}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[color:var(--text-2)]">
                Followers
              </span>
              <span
                className={`text-sm font-medium text-[color:var(--text-1)] transition-opacity ${
                  isLoadingStats && !isRefreshing ? "opacity-50" : ""
                }`}
              >
                {isLoadingStats && !isRefreshing ? "..." : stats.followers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[color:var(--text-2)]">
                Following
              </span>
              <span
                className={`text-sm font-medium text-[color:var(--text-1)] transition-opacity ${
                  isLoadingStats && !isRefreshing ? "opacity-50" : ""
                }`}
              >
                {isLoadingStats && !isRefreshing ? "..." : stats.following}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
