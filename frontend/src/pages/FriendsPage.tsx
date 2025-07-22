import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  Loader,
  Bell,
  ArrowRight,
} from "lucide-react";
import type { Author } from "../types/models";
import { api } from "../services/api";
import { socialService } from "../services/social";
import { useAuth } from "../components/context/AuthContext";
import AuthorCard from "../components/AuthorCard";
import Input from "../components/ui/Input";
import AnimatedGradient from "../components/ui/AnimatedGradient";
import Card from "../components/ui/Card";
import { useParams } from "react-router-dom";

type FilterType = "friends" | "following" | "followers";

type FriendsPageProps = {
  defaultFilter?: FilterType;
};

export const FriendsPage: React.FC<FriendsPageProps> = ({
  defaultFilter = "friends",
}) => {
  const { user: currentUser } = useAuth();
  //const [filter, setFilter] = useState<FilterType>("friends");
  const { id: authorId } = useParams();
  const [filter, setFilter] = useState<FilterType>(defaultFilter);

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const loadAllCounts = useCallback(async () => {
    if (!currentUser) return;

    try {
      const [friends, following, followers, pendingRequests] =
        await Promise.all([
          api.getFriends(authorId ?? currentUser.id),
          api.getFollowing(authorId ?? currentUser.id),
          api.getFollowers(authorId ?? currentUser.id),
          socialService.getPendingFollowRequests({ page: 1, page_size: 1 }),
        ]);

      setFriendsCount(friends.length);
      setFollowingCount(following.length);
      setFollowersCount(followers.length);
      setPendingRequestsCount(pendingRequests.count || 0);
    } catch (error) {
      console.error("Error loading counts:", error);
    }
  }, [currentUser, authorId]);

  const fetchAuthors = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      let fetchedAuthors: Author[] = [];

      switch (filter) {
        case "friends":
          fetchedAuthors = await api.getFriends(authorId ?? currentUser.id);
          break;
        case "following":
          fetchedAuthors = await api.getFollowing(authorId ?? currentUser.id);
          break;
        case "followers":
          fetchedAuthors = await api.getFollowers(authorId ?? currentUser.id);
          break;
      }

      setAuthors(fetchedAuthors);
    } catch (error) {
      console.error("Error fetching authors:", error);
      setAuthors([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, authorId, filter]);

  useEffect(() => {
    if (currentUser) {
      fetchAuthors();
      loadAllCounts();
    }
  }, [filter, currentUser, fetchAuthors, loadAllCounts]);

  const handleFollowToggle = async () => {
    // Refresh the current list and counts after follow/unfollow action
    await Promise.all([fetchAuthors(), loadAllCounts()]);
  };

  const filteredAuthors = (authors || []).filter(
    (author) =>
      author.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      author.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (author.github_username &&
        author.github_username
          .toLowerCase()
          .includes(searchQuery.toLowerCase()))
  );

  const getEmptyMessage = () => {
    switch (filter) {
      case "friends":
        return "You don't have any friends yet. Start following people and wait for them to follow you back!";
      case "following":
        return "You're not following anyone yet. Explore and connect with other users!";
      case "followers":
        return "You don't have any followers yet. Share great content to attract followers!";
    }
  };

  const getIcon = () => {
    switch (filter) {
      case "friends":
        return <Users size={48} />;
      case "following":
        return <UserPlus size={48} />;
      case "followers":
        return <UserCheck size={48} />;
    }
  };

  return (
    <div className="w-full px-4 lg:px-6 py-6 max-w-6xl mx-auto flex flex-col flex-1">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-1 mb-2">Connections</h1>
        <p className="text-text-2">Manage your social network</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {filter === "friends" ? (
            <AnimatedGradient
              gradientColors={[
                "var(--primary-purple)",
                "var(--primary-pink)",
                "var(--primary-violet)",
              ]}
              className="px-4 py-2 rounded-lg shadow-md cursor-pointer flex items-center gap-2 flex-shrink-0"
              textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center gap-2"
              duration={20}
              onClick={() => setFilter("friends")}
            >
              <Users size={18} />
              <span className="font-medium">Friends</span>
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {friendsCount}
              </span>
            </AnimatedGradient>
          ) : (
            <div
              className="px-4 py-2 rounded-lg text-text-2 hover:text-text-1 hover:bg-glass-low transition-all cursor-pointer flex-shrink-0"
              onClick={() => setFilter("friends")}
            >
              <motion.div
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Users size={18} />
                <span className="font-medium">Friends</span>
                <span className="ml-1 px-2 py-0.5 bg-glass-low rounded-full text-xs">
                  {friendsCount}
                </span>
              </motion.div>
            </div>
          )}

          {filter === "following" ? (
            <AnimatedGradient
              gradientColors={[
                "var(--primary-teal)",
                "var(--primary-blue)",
                "var(--primary-purple)",
              ]}
              className="px-4 py-2 rounded-lg shadow-md cursor-pointer flex items-center gap-2 flex-shrink-0"
              textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center gap-2"
              duration={25}
              onClick={() => setFilter("following")}
            >
              <UserPlus size={18} />
              <span className="font-medium">Following</span>
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {followingCount}
              </span>
            </AnimatedGradient>
          ) : (
            <div
              className="px-4 py-2 rounded-lg text-text-2 hover:text-text-1 hover:bg-glass-low transition-all cursor-pointer flex-shrink-0"
              onClick={() => setFilter("following")}
            >
              <motion.div
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <UserPlus size={18} />
                <span className="font-medium">Following</span>
                <span className="ml-1 px-2 py-0.5 bg-glass-low rounded-full text-xs">
                  {followingCount}
                </span>
              </motion.div>
            </div>
          )}

          {filter === "followers" ? (
            <AnimatedGradient
              gradientColors={[
                "var(--primary-coral)",
                "var(--primary-yellow)",
                "var(--primary-pink)",
              ]}
              className="px-4 py-2 rounded-lg shadow-md cursor-pointer flex items-center gap-2 flex-shrink-0"
              textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center gap-2"
              duration={30}
              onClick={() => setFilter("followers")}
            >
              <UserCheck size={18} />
              <span className="font-medium">Followers</span>
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {followersCount}
              </span>
            </AnimatedGradient>
          ) : (
            <div
              className="px-4 py-2 rounded-lg text-text-2 hover:text-text-1 hover:bg-glass-low transition-all cursor-pointer flex-shrink-0"
              onClick={() => setFilter("followers")}
            >
              <motion.div
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <UserCheck size={18} />
                <span className="font-medium">Followers</span>
                <span className="ml-1 px-2 py-0.5 bg-glass-low rounded-full text-xs">
                  {followersCount}
                </span>
              </motion.div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="w-full lg:w-64">
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
      </div>

      {/* Follow Requests Notification */}
      {(() => {
        const isSelf = authorId === undefined || authorId === currentUser?.id;
        return (
          isSelf &&
          pendingRequestsCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Link to="/follow-requests">
                <Card
                  variant="prominent"
                  className="p-4 bg-gradient-to-r from-[var(--primary-violet)]/10 to-[var(--primary-purple)]/10 
                           border border-[var(--primary-violet)]/20 hover:border-[var(--primary-violet)]/40 
                           transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-[var(--primary-violet)]/20 group-hover:bg-[var(--primary-violet)]/30 transition-colors">
                        <Bell
                          size={20}
                          className="text-[var(--primary-violet)]"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-1">
                          {pendingRequestsCount} pending follow{" "}
                          {pendingRequestsCount === 1 ? "request" : "requests"}
                        </h3>
                        <p className="text-sm text-text-2">
                          Review and manage who can follow you
                        </p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight
                        size={20}
                        className="text-[var(--primary-violet)]"
                      />
                    </motion.div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          )
        );
      })()}

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex justify-center items-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="glass-card-main rounded-full p-5 shadow-lg"
            >
              <Loader className="w-8 h-8 text-brand-500" />
            </motion.div>
          </div>
        ) : filteredAuthors.length === 0 ? (
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
                {getIcon()}
              </div>
              <h3 className="font-medium text-lg mb-2 text-text-1">
                {searchQuery ? "No results found" : `No ${filter} yet`}
              </h3>
              <p className="text-text-2 max-w-md mx-auto">
                {searchQuery
                  ? `Try searching with a different term.`
                  : getEmptyMessage()}
              </p>
            </Card>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 flex-1">
            <AnimatePresence mode="popLayout">
              {filteredAuthors.map((author, index) => {
                const isSelf = !authorId || authorId === currentUser?.id;
                return (
                  <motion.div
                    key={author.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    layout
                  >
                    <AuthorCard
                      author={author}
                      variant="default"
                      showStats={true}
                      showBio={true}
                      showActions={isSelf}
                      onFollow={handleFollowToggle}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
