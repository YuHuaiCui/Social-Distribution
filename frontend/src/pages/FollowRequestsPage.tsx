import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Check,
  X,
  Users,
  Clock,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../components/context/AuthContext";
import { socialService } from "../services/social";
import Loader from "../components/ui/Loader";
import { extractUUID } from "../utils/extractId";
import Card from "../components/ui/Card";
import Avatar from "../components/Avatar/Avatar";
import AnimatedButton from "../components/ui/AnimatedButton";
import { useToast } from "../components/context/ToastContext";
import type { Follow, Author } from "../types/models";

export const FollowRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [requests, setRequests] = useState<Follow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchFollowRequests = async (pageNum: number, append = false) => {
    if (!user) return;

    try {
      setIsLoadingMore(append);
      const response = await socialService.getRequestingFollowRequests({
        page: pageNum,
        page_size: 10,
      });

      if (append) {
        setRequests((prev) => [...prev, ...response.results]);
      } else {
        setRequests(response.results);
      }

      setHasMore(!!response.next);
    } catch (error) {
      console.error("Error fetching follow requests:", error);
      showError("Failed to load follow requests");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFollowRequests(1);
  }, [user]);

  const handleAccept = async (followId: string) => {
    setProcessingIds((prev) => new Set(prev).add(followId));

    try {
      await socialService.acceptFollowRequest(followId);
      showSuccess("Follow request accepted!");

      // Remove from list
      setRequests((prev) => prev.filter((req) => req.id !== followId));
    } catch (error) {
      console.error("Error accepting follow request:", error);
      showError("Failed to accept follow request");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(followId);
        return newSet;
      });
    }
  };

  const handleReject = async (followId: string) => {
    setProcessingIds((prev) => new Set(prev).add(followId));

    try {
      await socialService.rejectFollowRequest(followId);
      showSuccess("Follow request rejected");

      // Remove from list
      setRequests((prev) => prev.filter((req) => req.id !== followId));
    } catch (error) {
      console.error("Error rejecting follow request:", error);
      showError("Failed to reject follow request");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(followId);
        return newSet;
      });
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchFollowRequests(page + 1, true);
      setPage((prev) => prev + 1);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Type guard to check if follower is an Author object
  const isAuthorObject = (follower: unknown): follower is Author => {
    return (
      follower !== null &&
      typeof follower === "object" &&
      "id" in (follower as Record<string, unknown>)
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" message="Loading follow requests..." />
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
        <div className="flex items-center justify-between">
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
              <UserPlus className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-text-1">
                Follow Requests
              </h1>
              <p className="text-sm text-text-2">
                People who want to follow you
              </p>
            </div>
          </div>

          {requests.length > 0 && (
            <div className="flex items-center space-x-2 text-text-2">
              <Clock size={16} />
              <span className="text-sm">{requests.length} pending</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Requests List */}
      {requests.length === 0 ? (
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
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="inline-block mb-4"
            >
              <UserCheck size={48} className="text-text-2" />
            </motion.div>
            <h2 className="text-xl font-semibold text-text-1 mb-2">
              No pending follow requests
            </h2>
            <p className="text-text-2 mb-6 max-w-md mx-auto">
              When someone requests to follow you, you'll see them here. You can
              approve or deny their request.
            </p>
            <AnimatedButton
              onClick={() => (window.location.href = "/friends")}
              variant="primary"
            >
              View Friends
            </AnimatedButton>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {requests.map((request, index) => {
              const follower = request.actor;
              const isProcessing = processingIds.has(request.id);

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    variant="main"
                    className="p-4 bg-[rgba(var(--glass-rgb),0.4)] backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Link
                          to={
                            isAuthorObject(follower)
                              ? `/authors/${extractUUID(follower.id)}`
                              : "#"
                          }
                          className="hover:opacity-80 transition-opacity"
                        >
                          <motion.div whileHover={{ scale: 1.05 }}>
                            <Avatar
                              imgSrc={
                                isAuthorObject(follower)
                                  ? follower.profileImage
                                  : undefined
                              }
                              alt={
                                isAuthorObject(follower)
                                  ? follower.displayName
                                  : "User"
                              }
                              size="lg"
                            />
                          </motion.div>
                        </Link>
                        <div>
                          <Link
                            to={
                              isAuthorObject(follower)
                                ? `/authors/${extractUUID(follower.id)}`
                                : "#"
                            }
                            className="hover:text-[var(--primary-violet)] transition-colors"
                          >
                            <h3 className="font-semibold text-text-1">
                              {isAuthorObject(follower)
                                ? follower.displayName
                                : "Unknown User"}
                            </h3>
                          </Link>
                          <p className="text-sm text-text-2">
                            @
                            {isAuthorObject(follower)
                              ? follower.username
                              : "unknown"}
                          </p>
                          {isAuthorObject(follower) && follower.bio && (
                            <p className="text-sm text-text-2 mt-1 line-clamp-2">
                              {follower.bio}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <Clock size={12} className="text-text-2" />
                            <span className="text-xs text-text-2">
                              {formatTime(request.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <AnimatedButton
                          onClick={() => handleAccept(request.id)}
                          variant="primary"
                          size="sm"
                          loading={isProcessing}
                          disabled={isProcessing}
                          icon={<Check size={16} />}
                        >
                          Accept
                        </AnimatedButton>
                        <AnimatedButton
                          onClick={() => handleReject(request.id)}
                          variant="secondary"
                          size="sm"
                          loading={isProcessing}
                          disabled={isProcessing}
                          icon={<X size={16} />}
                        >
                          Reject
                        </AnimatedButton>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

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

          {/* Info Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 rounded-lg bg-[var(--primary-teal)]/10 border border-[var(--primary-teal)]/20"
          >
            <div className="flex items-start space-x-2">
              <AlertCircle
                size={16}
                className="text-[var(--primary-teal)] mt-0.5"
              />
              <div className="text-sm text-text-2">
                <p className="font-medium text-text-1 mb-1">
                  About follow requests
                </p>
                <p>
                  When you accept a follow request, the person will be able to
                  see your posts marked as "Friends Only" and will be notified
                  of your new posts.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FollowRequestsPage;
