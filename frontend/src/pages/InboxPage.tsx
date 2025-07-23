import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  UserPlus,
  Share2,
  Heart,
  MessageCircle,
  Check,
  X,
  Clock,
  Bell,
  Shield,
} from "lucide-react";
import AnimatedButton from "../components/ui/AnimatedButton";
import Card from "../components/ui/Card";
import Avatar from "../components/Avatar/Avatar";
import Loader from "../components/ui/Loader";
import { inboxService } from "../services/inbox";
import type { InboxItem as ApiInboxItem } from "../types/inbox";
import { useAuth } from "../components/context/AuthContext";
import { extractUUID } from "../utils/extractId";

type InboxItemType =
  | "follow_request"
  | "post_share"
  | "like"
  | "comment"
  | "mention"
  | "report";

interface FrontendInboxItem {
  id: string;
  type: InboxItemType;
  from_author: {
    id: string;
    display_name: string;
    username: string;
    profile_image?: string;
  };
  created_at: string;
  is_read: boolean;
  data?: {
    post_id?: string;
    post_title?: string;
    comment_text?: string;
  };
}

const inboxTypeConfig = {
  follow_request: {
    icon: UserPlus,
    color: "text-[var(--primary-purple)]",
    bgColor: "bg-[var(--primary-purple)]/10",
    title: "sent you a follow request",
  },
  post_share: {
    icon: Share2,
    color: "text-[var(--primary-teal)]",
    bgColor: "bg-[var(--primary-teal)]/10",
    title: "shared a post with you",
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
  mention: {
    icon: Bell,
    color: "text-[var(--primary-coral)]",
    bgColor: "bg-[var(--primary-coral)]/10",
    title: "mentioned you",
  },
  report: {
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    title: "reported a user",
  },
};

export const InboxPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<FrontendInboxItem[]>([]);
  const [filter, setFilter] = useState<InboxItemType | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [processingItems, setProcessingItems] = useState<Set<string>>(
    new Set()
  );
  const [showAllRequests, setShowAllRequests] = useState(false);

  // Check if current user is admin
  const isAdmin = user?.is_staff || user?.is_superuser;

  useEffect(() => {
    fetchInboxItems();
  }, [filter, showAllRequests]);

  const fetchInboxItems = async () => {
    setIsLoading(true);
    try {
      // Prepare filter parameters
      const params: any = {};
      if (filter !== "all") {
        // Map frontend filter types to backend content types
        const typeMapping = {
          follow_request: "follow",
          post_share: "entry_link",
          like: "like",
          comment: "comment",
          mention: "entry", // mentions would be entries that mention the user
          report: "report",
        };
        params.content_type = typeMapping[filter as keyof typeof typeMapping];
      }

      // If admin and showing all requests, use a different endpoint
      if (isAdmin && showAllRequests && filter === "follow_request") {
        // For now, we'll use the same endpoint but you could add a backend endpoint
        // to fetch all follow requests across the system
        params.all_requests = true;
      }

      const response = await inboxService.getInbox(params);

      // Transform API response to frontend format
      const transformedItems: FrontendInboxItem[] = response.results.map(
        (apiItem: ApiInboxItem) => {
          let type: InboxItemType;
          let from_author = {
            id: "",
            display_name: "Unknown",
            username: "unknown",
            profile_image: undefined as string | undefined,
          };
          let data: any = {};

          // Map backend content types to frontend types
          switch (apiItem.content_type) {
            case "follow":
              type = "follow_request";
              if (apiItem.content_data?.type === "follow" && apiItem.sender) {
                if (typeof apiItem.sender === "object") {
                  from_author = {
                    id: apiItem.sender.id || apiItem.sender.url,
                    display_name:
                      apiItem.sender.display_name ||
                      apiItem.sender.username ||
                      "Unknown",
                    username: apiItem.sender.username || "unknown",
                    profile_image: apiItem.sender.profile_image || undefined,
                  };
                }
              }
              break;
            case "like":
              type = "like";
              if (apiItem.content_data?.type === "like" && apiItem.sender) {
                if (typeof apiItem.sender === "object") {
                  from_author = {
                    id: apiItem.sender.id || apiItem.sender.url,
                    display_name:
                      apiItem.sender.display_name ||
                      apiItem.sender.username ||
                      "Unknown",
                    username: apiItem.sender.username || "unknown",
                    profile_image: apiItem.sender.profile_image || undefined,
                  };
                }
              }
              break;
            case "comment":
              type = "comment";
              if (apiItem.content_data?.type === "comment" && apiItem.sender) {
                if (typeof apiItem.sender === "object") {
                  from_author = {
                    id: apiItem.sender.id || apiItem.sender.url,
                    display_name:
                      apiItem.sender.display_name ||
                      apiItem.sender.username ||
                      "Unknown",
                    username: apiItem.sender.username || "unknown",
                    profile_image: apiItem.sender.profile_image || undefined,
                  };
                }
                if (apiItem.content_data.data) {
                  data.comment_text = (
                    apiItem.content_data.data as any
                  )?.comment;
                }
              }
              break;
            case "entry":
              type = "mention";
              if (apiItem.content_data?.type === "entry" && apiItem.sender) {
                if (typeof apiItem.sender === "object") {
                  from_author = {
                    id: apiItem.sender.id || apiItem.sender.url,
                    display_name:
                      apiItem.sender.display_name ||
                      apiItem.sender.username ||
                      "Unknown",
                    username: apiItem.sender.username || "unknown",
                    profile_image: apiItem.sender.profile_image || undefined,
                  };
                }
                if (apiItem.content_data.data) {
                  data.post_title = (apiItem.content_data.data as any)?.title;
                }
              }
              break;
            case "entry_link":
              type = "post_share";
              if (apiItem.sender && typeof apiItem.sender === "object") {
                from_author = {
                  id: apiItem.sender.id || apiItem.sender.url,
                  display_name:
                    apiItem.sender.display_name ||
                    apiItem.sender.username ||
                    "Unknown",
                  username: apiItem.sender.username || "unknown",
                  profile_image: apiItem.sender.profile_image || undefined,
                };
              }
              if (apiItem.content_data?.type === "entry_link") {
                data.post_title = (apiItem.content_data.data as any)?.title;
              }
              break;
            case "report":
              type = "report";
              // For reports, extract reporter and reported user info from content_data
              if (apiItem.content_data) {
                from_author = {
                  id: apiItem.content_data.reporter_id || "",
                  display_name:
                    apiItem.content_data.reporter_name || "Unknown Reporter",
                  username: apiItem.content_data.reporter_name || "unknown",
                  profile_image: undefined,
                };
                data = {
                  reported_user_id: apiItem.content_data.reported_user_id,
                  reported_user_name: apiItem.content_data.reported_user_name,
                  report_time: apiItem.content_data.report_time,
                  report_type: apiItem.content_data.report_type,
                };
              }
              break;
            default:
              type = "mention";
          }

          return {
            id: apiItem.id,
            type,
            from_author,
            created_at: apiItem.created_at,
            is_read: apiItem.read || false,
            data,
          };
        }
      );

      // Filter out report items for non-admin users
      const filteredItems = isAdmin
        ? transformedItems
        : transformedItems.filter((item) => item.type !== "report");

      setItems(filteredItems);
    } catch (error) {
      console.error("Error fetching inbox:", error);
      // Fallback to empty array on error
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowRequest = async (itemId: string, accept: boolean) => {
    setProcessingItems((prev) => new Set(prev).add(itemId));
    try {
      if (accept) {
        await inboxService.acceptFollowRequest(itemId);
      } else {
        await inboxService.rejectFollowRequest(itemId);
      }

      // Remove item after processing
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error("Error processing follow request:", error);
    } finally {
      setProcessingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const markAsRead = async (itemId: string) => {
    try {
      await inboxService.markItemAsRead(itemId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, is_read: true } : item
        )
      );
    } catch (error) {
      console.error("Error marking as read:", error);
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
    { value: "post_share", label: "Shared Posts" },
    { value: "like", label: "Likes" },
    { value: "comment", label: "Comments" },
    ...(isAdmin ? [{ value: "report", label: "Reports" }] : []),
  ];

  const unreadCount = items.filter((item) => !item.is_read).length;

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
            {unreadCount > 0 && (
              <p className="text-sm text-text-2">
                {unreadCount} unread notifications
              </p>
            )}
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
            onClick={() => setFilter(btn.value as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === btn.value
                ? "bg-[var(--gradient-primary)] text-white"
                : "glass-card-subtle text-text-2 hover:text-text-1"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={
              filter === btn.value
                ? {
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }
                : {}
            }
            transition={
              filter === btn.value
                ? {
                    backgroundPosition: {
                      duration: 20,
                      repeat: Infinity,
                    },
                  }
                : {}
            }
            style={
              filter === btn.value
                ? {
                    background: "var(--gradient-primary)",
                    backgroundSize: "200% 200%",
                  }
                : {}
            }
          >
            {btn.label}
          </motion.button>
        ))}

        {/* Admin toggle for viewing all follow requests */}
        {isAdmin && filter === "follow_request" && (
          <motion.button
            onClick={() => setShowAllRequests(!showAllRequests)}
            className={`ml-auto px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
              showAllRequests
                ? "bg-gradient-to-r from-[var(--primary-purple)] to-[var(--primary-pink)] text-white"
                : "glass-card-subtle text-text-2 hover:text-text-1"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield size={14} />
            <span>{showAllRequests ? "All Requests" : "My Requests"}</span>
          </motion.button>
        )}
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
                  : `No ${filter.replace("_", " ")} notifications`}
              </p>
            </Card>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => {
              const config = inboxTypeConfig[item.type];
              const Icon = config.icon;
              const isProcessing = processingItems.has(item.id);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="mb-3"
                  onMouseEnter={() => !item.is_read && markAsRead(item.id)}
                >
                  <Card
                    variant={item.is_read ? "subtle" : "main"}
                    hoverable
                    className={`${
                      !item.is_read
                        ? "border-l-4 border-[var(--primary-purple)]"
                        : ""
                    } bg-[rgba(var(--glass-rgb),${
                      item.is_read ? "0.3" : "0.4"
                    })] backdrop-blur-lg`}
                  >
                    <div className="flex items-start space-x-4 h-full">
                      {/* Author Avatar */}
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex-shrink-0"
                      >
                        <Avatar
                          imgSrc={item.from_author.profile_image}
                          alt={item.from_author.display_name}
                        />
                      </motion.div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 mr-4">
                            <p className="text-text-1">
                              <span className="font-semibold">
                                {item.from_author.display_name}
                              </span>{" "}
                              <span className="text-text-2">
                                {config.title}
                              </span>
                            </p>

                            {item.data?.post_title && (
                              <p className="text-sm text-text-2 mt-1">
                                "{item.data.post_title}"
                              </p>
                            )}

                            {item.data?.comment_text && (
                              <p className="text-sm text-text-1 mt-2 p-3 glass-card-subtle rounded-lg">
                                {item.data.comment_text}
                              </p>
                            )}

                            {/* Report Details */}
                            {item.type === "report" && item.data && (
                              <div className="mt-2 p-3 glass-card-subtle rounded-lg space-y-2">
                                <p className="text-sm text-text-2">
                                  Reported User:{" "}
                                  <Link
                                    to={`/authors/${extractUUID(
                                      item.data.reported_user_id
                                    )}`}
                                    className="text-[var(--primary-purple)] hover:underline font-medium"
                                  >
                                    {item.data.reported_user_name}
                                  </Link>
                                </p>
                                <p className="text-sm text-text-2">
                                  Reporter:{" "}
                                  <Link
                                    to={`/authors/${extractUUID(
                                      item.from_author.id
                                    )}`}
                                    className="text-[var(--primary-purple)] hover:underline font-medium"
                                  >
                                    {item.from_author.display_name}
                                  </Link>
                                </p>
                                <p className="text-xs text-text-2">
                                  Type:{" "}
                                  {item.data.report_type?.replace("_", " ")}
                                </p>
                              </div>
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
                              {!item.is_read && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary-purple)]/20 text-[var(--primary-purple)]">
                                  New
                                </span>
                              )}
                            </div>

                            {/* Actions for follow requests */}
                            {item.type === "follow_request" && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex space-x-2"
                              >
                                <AnimatedButton
                                  size="sm"
                                  variant="primary"
                                  onClick={() =>
                                    handleFollowRequest(item.id, true)
                                  }
                                  disabled={isProcessing}
                                  loading={isProcessing}
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
                                  disabled={isProcessing}
                                  icon={<X size={16} />}
                                  className="!outline-none !ring-0"
                                >
                                  Decline
                                </AnimatedButton>
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
