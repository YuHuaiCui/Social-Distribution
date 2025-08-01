import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserPlus,
  UserMinus,
  Users,
  FileText,
  MapPin,
  Link as LinkIcon,
  Calendar,
  MoreVertical,
  Mail,
  Ban,
  Flag,
  Clock,
  Shield,
  Trash2,
  UserX,
  CheckCircle,
  XCircle,
  Globe,
} from "lucide-react";
import type { Author } from "../types/models";
import Avatar from "./Avatar/Avatar";
import AnimatedButton from "./ui/AnimatedButton";
import Card from "./ui/Card";
import { api } from "../services/api";
import { socialService } from "../services/social";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";
import { extractUUID, getAuthorUrl, isRemoteAuthor } from "../utils/extractId";

interface AuthorCardProps {
  author: Author & {
    follower_count?: number;
    following_count?: number;
    post_count?: number;
    is_following?: boolean;
    is_followed_by?: boolean;
    location?: string;
    website?: string;
  };
  variant?: "default" | "compact" | "detailed";
  showStats?: boolean;
  showBio?: boolean;
  showActions?: boolean;
  onFollow?: (isFollowing: boolean) => void;
  className?: string;
}

export const AuthorCard: React.FC<AuthorCardProps> = ({
  author,
  variant = "default",
  showStats = true,
  showBio = true,
  showActions = true,
  onFollow,
  className = "",
}) => {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isFollowing, setIsFollowing] = useState(author.is_following || false);
  const [followStatus, setFollowStatus] = useState<
    "none" | "requesting" | "accepted" | "rejected"
  >("none");
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [followerCount, setFollowerCount] = useState(
    author.follower_count || 0
  );
  const [followingCount, setFollowingCount] = useState(
    author.following_count || 0
  );
  const [statsLoading, setStatsLoading] = useState(false);

  // Check if the current user is viewing their own profile
  const isOwnProfile = currentUser && currentUser.id === author.id;

  // Check follow status when component mounts or author changes
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser || isOwnProfile) return;

      try {
        // Use URLs instead of IDs for the follow status check
        // Extract UUID to ensure consistent format
        const currentUserId = extractUUID(currentUser.id);
        const authorId = extractUUID(author.id);
        
        // Use backend host for URL construction, not frontend host
        const currentUserUrl =
          currentUser.url ||
          `${currentUser.host}authors/${currentUserId}`;
        const authorUrl =
          author.url || `${author.host}authors/${authorId}`;
        const status = await socialService.checkFollowStatus(
          currentUserUrl,
          authorUrl
        );
        console.log('Follow status check:', {
          currentUserUrl,
          authorUrl,
          status,
          author
        });
        setIsFollowing(status.is_following);
        setFollowStatus(status.follow_status || "none");
      } catch (error) {
        console.error("Error checking follow status:", error);
        // Fallback to props
        setIsFollowing(author.is_following || false);
      }
    };

    checkFollowStatus();
  }, [author.id, currentUser, isOwnProfile]);

  // Fetch real follower/following counts from backend
  useEffect(() => {
    const fetchStats = async () => {
      if (!showStats) return;

      setStatsLoading(true);
      try {
        // For followers: always use UUID/serial for both local and remote authors
        // For following: use UUID for local authors, full URL for remote authors
        const followerIdentifier = extractUUID(author.id);
        const followingIdentifier = isRemoteAuthor(author) ? (author.url || author.id) : extractUUID(author.id);
        const [followers, following] = await Promise.all([
          api.getFollowers(followerIdentifier),
          api.getFollowing(followingIdentifier),
        ]);

        setFollowerCount(followers.length);
        setFollowingCount(following.length);
      } catch (error) {
        console.error("Error fetching author stats:", error);
        // Fall back to provided counts or 0
        setFollowerCount(author.follower_count || 0);
        setFollowingCount(author.following_count || 0);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [author.id, showStats, author.follower_count, author.following_count]);

  const handleFollow = async () => {
    setIsLoading(true);

    try {
      // Prevent following yourself
      if (
        currentUser &&
        extractUUID(currentUser.id) === extractUUID(author.id)
      ) {
        console.error("Cannot follow yourself");
        return;
      }

      if (followStatus === "accepted" || isFollowing) {
        // Unfollow
        await socialService.unfollowAuthor(extractUUID(author.id));
        setIsFollowing(false);
        setFollowStatus("none");
        setFollowerCount((prev) => Math.max(0, prev - 1));
        onFollow?.(false);
        // Dispatch event for other components
        window.dispatchEvent(new Event("follow-update"));
      } else if (followStatus === "none" || followStatus === "rejected") {
        // Send follow request
        await socialService.followAuthor(extractUUID(author.id));
        setFollowStatus("requesting");
        onFollow?.(false);
        
        // Re-check status after a short delay to ensure backend is updated
        setTimeout(async () => {
          try {
            const currentUserId = extractUUID(currentUser.id);
            const authorId = extractUUID(author.id);
            const backendHost = `${window.location.protocol}//${window.location.hostname}:8000`;
            const currentUserUrl = currentUser.url || `${backendHost}/api/authors/${currentUserId}/`;
            const authorUrl = author.url || `${backendHost}/api/authors/${authorId}/`;
            const updatedStatus = await socialService.checkFollowStatus(currentUserUrl, authorUrl);
            setFollowStatus(updatedStatus.follow_status || "none");
            setIsFollowing(updatedStatus.is_following);
          } catch (error) {
            console.error("Error re-checking follow status:", error);
          }
        }, 500);
        
        // Dispatch event for other components
        window.dispatchEvent(new Event("follow-update"));
      }
      // If status is 'requesting', clicking doesn't do anything
    } catch (error) {
      console.error("Error following/unfollowing:", error);
      console.error("Author ID:", author.id);
      console.error("Extracted UUID:", extractUUID(author.id));
      console.error("Current user:", currentUser?.id);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleReport = async () => {
    if (!currentUser) return;

    setShowMenu(false);
    try {
      // Create a report inbox item
      // For now, we'll send it as a special type of inbox item
      // The backend would need to handle 'report' content_type
      const reportData = {
        content_type: "report" as any, // We'll treat report as a special content type
        content_id: author.id,
        content_data: {
          reporter_id: currentUser.id,
          reporter_name: currentUser.displayName || currentUser.display_name,
          reported_user_id: author.id,
          reported_user_name: author.displayName || author.display_name,
          report_time: new Date().toISOString(),
          report_type: "user_report",
        },
      };

      // Find admin users to send report to
      // For now, we'll use a hardcoded approach - in production, you'd want an endpoint to get admin IDs
      // or have the backend handle routing reports to admins
      const adminsResponse = await api.getAuthors({
        page: 1,
      });
      const admins = adminsResponse.results || [];

      if (admins.length === 0) {
        showError("No admin users found to handle reports");
        return;
      }

      // Inbox functionality removed - reports are no longer sent to admin inboxes
      console.log('Report would be sent to admins:', admins.map(a => a.id));

      showSuccess("User has been reported to administrators");
    } catch (error) {
      console.error("Error reporting user:", error);
      showError("Failed to submit report");
    }
  };

  // Admin actions
  const handleAdminAction = async (
    action: "approve" | "deactivate" | "activate" | "delete"
  ) => {
    if (!currentUser?.is_staff) return;

    setIsLoading(true);
    try {
      switch (action) {
        case "approve":
          await api.approveAuthor(extractUUID(author.id));
          break;
        case "deactivate":
          await api.deactivateAuthor(extractUUID(author.id));
          break;
        case "activate":
          await api.activateAuthor(extractUUID(author.id));
          break;
        case "delete":
          if (
            window.confirm(
              `Are you sure you want to delete ${author.displayName || author.display_name}?`
            )
          ) {
            await api.deleteAuthor(extractUUID(author.id));
          }
          break;
      }
      // Refresh the page or notify parent component
      window.location.reload();
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    } finally {
      setIsLoading(false);
      setShowMenu(false);
    }
  };

  if (variant === "compact") {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`flex items-center space-x-3 p-3 rounded-lg glass-card-subtle bg-[rgba(var(--glass-rgb),0.85)] backdrop-blur-md hover:bg-glass-low transition-all ${className}`}
      >
        <Link to={getAuthorUrl(author)}>
          <Avatar
            imgSrc={author.profileImage || author.profile_image}
            alt={author.displayName || author.display_name || "Unknown"}
            size="md"
            isAdmin={author.is_staff || author.is_superuser}
          />
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            to={getAuthorUrl(author)}
            className="hover:underline"
          >
            <h4 className="font-medium text-text-1 truncate flex items-center gap-1">
              {author.displayName || author.display_name || "Unknown"}
              {isRemoteAuthor(author) && (
                <Globe size={10} className="text-blue-500 shrink-0" title="Remote Author" />
              )}
            </h4>
          </Link>
        </div>

        {showActions && !isOwnProfile && (
          <AnimatedButton
            size="sm"
            variant={
              followStatus === "requesting"
                ? "secondary"
                : isFollowing || followStatus === "accepted"
                ? "secondary"
                : "primary"
            }
            onClick={handleFollow}
            loading={isLoading}
            disabled={followStatus === "requesting"}
            icon={followStatus === "requesting" ? <Clock size={14} /> : null}
            className={
              followStatus === "requesting"
                ? "opacity-60 bg-glass-low border border-glass-high"
                : ""
            }
          >
            {followStatus === "requesting"
              ? "Requested"
              : isFollowing || followStatus === "accepted"
              ? "Followed"
              : "Follow"}
          </AnimatedButton>
        )}
      </motion.div>
    );
  }

  return (
    <Card
      variant="main"
      hoverable
      className={`bg-[rgba(var(--glass-rgb),0.85)] backdrop-blur-md ${className}`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <Link
            to={getAuthorUrl(author)}
            className="flex items-center space-x-4"
          >
            <motion.div whileHover={{ scale: 1.05 }}>
              <Avatar
                imgSrc={author.profileImage || author.profile_image}
                alt={author.displayName || author.display_name || "Unknown"}
                size={variant === "detailed" ? "xl" : "lg"}
                isAdmin={author.is_staff || author.is_superuser}
              />
            </motion.div>

            <div>
              <h3 className="text-lg font-semibold text-text-1 hover:underline flex items-center gap-2">
                {author.displayName || author.display_name || "Unknown"}
                {isRemoteAuthor(author) && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" title="Remote Author">
                    <Globe size={12} className="mr-1" />
                    Remote
                  </span>
                )}
              </h3>

              {author.is_followed_by && (
                <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs bg-glass-low text-text-2">
                  Follows you
                </span>
              )}
            </div>
          </Link>

          {showActions && !isOwnProfile && (
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-glass-low transition-colors"
              >
                <MoreVertical size={18} className="text-text-2" />
              </motion.button>

              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 mt-2 w-48 glass-card-prominent rounded-lg shadow-lg overflow-hidden z-10"
                >
                  <button className="w-full px-4 py-2 text-left text-text-1 hover:bg-glass-low transition-colors flex items-center space-x-2">
                    <Mail size={16} />
                    <span>Send Message</span>
                  </button>
                  <button className="w-full px-4 py-2 text-left text-text-1 hover:bg-glass-low transition-colors flex items-center space-x-2">
                    <Ban size={16} />
                    <span>Block User</span>
                  </button>
                  <button
                    onClick={() => handleReport()}
                    className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center space-x-2"
                  >
                    <Flag size={16} />
                    <span>Report</span>
                  </button>

                  {/* Admin controls */}
                  {currentUser?.is_staff && (
                    <>
                      <div className="border-t border-border-1 my-1" />
                      <div className="px-3 py-1.5 text-xs text-text-2 font-medium flex items-center space-x-1">
                        <Shield size={12} />
                        <span>Admin Actions</span>
                      </div>

                      {!author.is_approved && (
                        <button
                          onClick={() => handleAdminAction("approve")}
                          className="w-full px-4 py-2 text-left text-green-500 hover:bg-green-500/10 transition-colors flex items-center space-x-2"
                        >
                          <CheckCircle size={16} />
                          <span>Approve User</span>
                        </button>
                      )}

                      {author.is_active ? (
                        <button
                          onClick={() => handleAdminAction("deactivate")}
                          className="w-full px-4 py-2 text-left text-orange-500 hover:bg-orange-500/10 transition-colors flex items-center space-x-2"
                        >
                          <UserX size={16} />
                          <span>Deactivate User</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAdminAction("activate")}
                          className="w-full px-4 py-2 text-left text-blue-500 hover:bg-blue-500/10 transition-colors flex items-center space-x-2"
                        >
                          <CheckCircle size={16} />
                          <span>Activate User</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleAdminAction("delete")}
                        className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center space-x-2"
                      >
                        <Trash2 size={16} />
                        <span>Delete User</span>
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Bio */}
        {showBio && author.bio && (
          <p className="text-text-1 mb-4 line-clamp-3">{author.bio}</p>
        )}

        {/* Stats */}
        {showStats && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm">
            <Link
              to={`/authors/${extractUUID(author.id)}/followers`}
              className="flex items-center space-x-1 hover:underline min-w-0"
            >
              <Users size={16} className="text-text-2 flex-shrink-0" />
              <span
                className={`font-semibold text-text-1 ${
                  statsLoading ? "opacity-50" : ""
                }`}
              >
                {formatCount(followerCount)}
              </span>
              <span className="text-text-2">followers</span>
            </Link>

            <Link
              to={`/authors/${extractUUID(author.id)}/following`}
              className="flex items-center space-x-1 hover:underline min-w-0"
            >
              <span
                className={`font-semibold text-text-1 ${
                  statsLoading ? "opacity-50" : ""
                }`}
              >
                {formatCount(followingCount)}
              </span>
              <span className="text-text-2">following</span>
            </Link>
          </div>
        )}

        {/* Additional Info (detailed variant) */}
        {variant === "detailed" && (
          <div className="space-y-2 mb-4 text-sm text-text-2">
            {author.location && (
              <div className="flex items-center space-x-2">
                <MapPin size={16} />
                <span>{author.location}</span>
              </div>
            )}

            {author.website && (
              <div className="flex items-center space-x-2">
                <LinkIcon size={16} />
                <a
                  href={author.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--primary-violet)] hover:underline"
                >
                  {author.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}

          </div>
        )}

        {/* Follow Button */}
        {showActions && !isOwnProfile && (
          <AnimatedButton
            variant={
              followStatus === "requesting"
                ? "secondary"
                : isFollowing || followStatus === "accepted"
                ? "secondary"
                : "primary"
            }
            onClick={handleFollow}
            loading={isLoading}
            disabled={followStatus === "requesting"}
            icon={
              followStatus === "requesting" ? (
                <Clock size={16} />
              ) : isFollowing || followStatus === "accepted" ? (
                <UserMinus size={16} />
              ) : (
                <UserPlus size={16} />
              )
            }
            className={`w-full ${
              followStatus === "requesting"
                ? "opacity-60 bg-glass-low border border-glass-high"
                : ""
            }`}
          >
            {followStatus === "requesting"
              ? "Requested"
              : isFollowing || followStatus === "accepted"
              ? "Followed"
              : "Follow"}
          </AnimatedButton>
        )}
      </div>
    </Card>
  );
};

// Grid variant for displaying multiple authors
interface AuthorGridProps {
  authors: AuthorCardProps["author"][];
  columns?: 1 | 2 | 3 | 4;
  variant?: AuthorCardProps["variant"];
  className?: string;
}

export const AuthorGrid: React.FC<AuthorGridProps> = ({
  authors,
  columns = 3,
  variant = "default",
  className = "",
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {authors.map((author, index) => (
        <motion.div
          key={author.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <AuthorCard author={author} variant={variant} />
        </motion.div>
      ))}
    </div>
  );
};

export default AuthorCard;
