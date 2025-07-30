import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  UserPlus,
  Heart,
  MessageCircle,
  Check,
  X,
  Clock,
  Bell,
  CheckCircle,
  XCircle,
} from "lucide-react";
import AnimatedButton from "../components/ui/AnimatedButton";
import Card from "../components/ui/Card";
import Avatar from "../components/Avatar/Avatar";
import Loader from "../components/ui/Loader";
import { socialService } from "../services/social";
import { useAuth } from "../components/context/AuthContext";
import { extractUUID } from "../utils/extractId";
import type { Follow } from "../types/social";

type InboxItemType = "follow_request" | "like" | "comment";

interface FollowRequestItem {
  type: "follow_request";
  id: string;
  from_author: {
    id: string;
    displayName: string;
    username: string;
    profileImage?: string;
  };
  created_at: string;
  status: "requesting" | "accepted" | "rejected";
}

interface LikeItem {
  type: "like";
  id: string;
  from_author: {
    id: string;
    displayName: string;
    username: string;
    profileImage?: string;
  };
  entry: {
    id: string;
    title: string;
    url: string;
  };
  created_at: string;
}

interface CommentItem {
  type: "comment";
  id: string;
  from_author: {
    id: string;
    displayName: string;
    username: string;
    profileImage?: string;
  };
  entry: {
    id: string;
    title: string;
    url: string;
  };
  content: string;
  created_at: string;
}

type InboxItem = FollowRequestItem | LikeItem | CommentItem;

const inboxTypeConfig = {
  follow_request: {
    icon: UserPlus,
    color: "text-[var(--primary-purple)]",
    bgColor: "bg-[var(--primary-purple)]/10",
    title: "sent you a follow request",
  },
  like: {
    icon: Heart,
    color: "text-[var(--primary-pink)]",
    bgColor: "bg-[var(--primary-pink)]/10",
    title: "liked your post",
  },
  comment: {
    icon: MessageCircle,
    color: "text-[var(--primary-blue)]",
    bgColor: "bg-[var(--primary-blue)]/10",
    title: "commented on your post",
  },
};

export const InboxPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [filter, setFilter] = useState<InboxItemType | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [processingItems, setProcessingItems] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchInboxItems();
  }, [filter]);

  const fetchInboxItems = async () => {
    setIsLoading(true);
    try {
      const allItems: InboxItem[] = [];

      // Fetch follow requests if showing all or follow requests
      if (filter === "all" || filter === "follow_request") {
        try {
          const followRequests = await socialService.getAllFollowRequests();
          const followItems: FollowRequestItem[] = followRequests.map((follow: Follow) => ({
            type: "follow_request" as const,
            id: follow.id,
            from_author: {
              id: follow.actor.id,
              displayName: follow.actor.displayName,
              username: follow.actor.displayName, // Use displayName as fallback
              profile_image: follow.actor.profileImage,
            },
            created_at: follow.created_at || new Date().toISOString(),
            status: follow.status,
          }));
          allItems.push(...followItems);
        } catch (error) {
          console.error("Error fetching follow requests:", error);
        }
      }

      // Fetch likes if showing all or likes
      if (filter === "all" || filter === "like") {
        try {
          const likesResponse = await socialService.getReceivedLikes();
          const likeItems: LikeItem[] = likesResponse.items.map((like) => {
            // Extract entry ID from the object URL
            const entryId = like.object.split('/').filter(Boolean).pop() || '';
            const entryUrl = like.object;
            
            return {
              type: "like" as const,
              id: like.id,
              from_author: {
                id: like.author.id,
                displayName: like.author.displayName,
                username: like.author.username || '',
                profileImage: like.author.profileImage,
              },
              entry: {
                id: entryId,
                title: "Post", // We don't have the title in the like object
                url: entryUrl,
              },
              created_at: like.published,
            };
          });
          allItems.push(...likeItems);
        } catch (error) {
          console.error("Error fetching received likes:", error);
        }
      }

      // Fetch comments if showing all or comments
      if (filter === "all" || filter === "comment") {
        try {
          const commentsResponse = await socialService.getReceivedComments();
          const commentItems: CommentItem[] = commentsResponse.comments.map((comment) => ({
            type: "comment" as const,
            id: comment.id,
            from_author: {
              id: comment.author.id,
              displayName: comment.author.displayName || comment.author.display_name,
              username: comment.author.username,
              profile_image: comment.author.profile_image,
            },
            entry: comment.entry,
            content: comment.content,
            created_at: comment.created_at,
          }));
          allItems.push(...commentItems);
        } catch (error) {
          console.error("Error fetching received comments:", error);
        }
      }

      // Sort all items by created_at (newest first)
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setItems(allItems);
    } catch (error) {
      console.error("Error fetching inbox:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowRequest = async (itemId: string, accept: boolean) => {
    setProcessingItems((prev) => new Set(prev).add(itemId));
    try {
      if (accept) {
        await socialService.acceptFollowRequest(itemId);
      } else {
        await socialService.rejectFollowRequest(itemId);
      }

      // Update the item status locally
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId && item.type === "follow_request"
            ? { ...item, status: accept ? "accepted" : "rejected" }
            : item
        )
      );
    } catch (error) {
      console.error("Error processing follow request:", error);
      alert(
        `Failed to ${accept ? "accept" : "reject"} follow request. Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setProcessingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
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

  const filterButtons = [
    { value: "all", label: "All" },
    { value: "follow_request", label: "Follow Requests" },
    { value: "like", label: "Likes" },
    { value: "comment", label: "Comments" },
  ];

  return (
    <div className="w-full px-4 lg:px-6 py-6 flex flex-col flex-1">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-purple)] to-[var(--primary-pink)] flex items-center justify-center shadow-lg">
            <Inbox className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-1">Inbox</h1>
            <p className="text-sm text-text-2">
              {items.length} notifications
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 mb-6"
      >
        {filterButtons.map((btn) => (
          <motion.button
            key={btn.value}
            onClick={() => setFilter(btn.value as InboxItemType | "all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === btn.value
                ? "bg-[var(--gradient-primary)] text-white"
                : "glass-card-subtle text-text-2 hover:text-text-1"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {btn.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Inbox Items */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex justify-center items-center py-16">
            <Loader size="lg" message="Loading notifications..." />
          </div>
        ) : items.length === 0 ? (
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
                <Inbox className="w-16 h-16" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium text-text-1 mb-2">
                No notifications
              </h3>
              <p className="text-text-2">
                {filter === "all"
                  ? "You're all caught up!"
                  : filter === "follow_request"
                  ? "No follow requests yet"
                  : `No ${filter.replace("_", " ")} notifications`}
              </p>
            </Card>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => {
              const config = inboxTypeConfig[item.type];
              const Icon = config.icon;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="mb-3"
                >
                  <Card
                    variant="main"
                    hoverable
                    className="bg-[rgba(var(--glass-rgb),0.4)] backdrop-blur-lg"
                  >
                    <div className="flex items-start space-x-4 h-full">
                      {/* Author Avatar */}
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex-shrink-0"
                      >
                        <Link to={`/authors/${extractUUID(item.from_author.id)}`}>
                          <Avatar
                            imgSrc={item.from_author.profileImage}
                            alt={item.from_author.displayName}
                          />
                        </Link>
                      </motion.div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 mr-4">
                            <p className="text-text-1">
                              <Link 
                                to={`/authors/${extractUUID(item.from_author.id)}`}
                                className="font-semibold text-[var(--primary-purple)] hover:underline"
                              >
                                {item.from_author.displayName}
                              </Link>{" "}
                              <span className="text-text-2">
                                {config.title}
                              </span>
                            </p>

                            {/* Entry title for likes and comments */}
                            {(item.type === "like" || item.type === "comment") && (
                              <Link 
                                to={`/entries/${extractUUID(item.entry.id)}`}
                                className="text-sm text-[var(--primary-purple)] hover:underline mt-1 block"
                              >
                                "{item.entry.title}"
                              </Link>
                            )}

                            {/* Comment content */}
                            {item.type === "comment" && (
                              <p className="text-sm text-text-1 mt-2 p-3 glass-card-subtle rounded-lg">
                                {item.content}
                              </p>
                            )}
                          </div>

                          {/* Type Icon */}
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                        </div>

                        {/* Footer - Always at bottom */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-xs text-text-2 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatTime(item.created_at)}
                              </span>
                            </div>

                            {/* Actions for follow requests */}
                            {item.type === "follow_request" && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex space-x-2"
                              >
                                {item.status === "requesting" ? (
                                  <>
                                    <AnimatedButton
                                      size="sm"
                                      variant="primary"
                                      onClick={() =>
                                        handleFollowRequest(item.id, true)
                                      }
                                      disabled={processingItems.has(item.id)}
                                      loading={processingItems.has(item.id)}
                                      icon={<Check size={16} />}
                                      className="!outline-none !ring-0"
                                    >
                                      Accept
                                    </AnimatedButton>
                                    <AnimatedButton
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        handleFollowRequest(item.id, false)
                                      }
                                      disabled={processingItems.has(item.id)}
                                      icon={<X size={16} />}
                                      className="!outline-none !ring-0"
                                    >
                                      Decline
                                    </AnimatedButton>
                                  </>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    {item.status === "accepted" ? (
                                      <>
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-green-500">Accepted</span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-4 h-4 text-red-500" />
                                        <span className="text-sm text-red-500">Rejected</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default InboxPage;
