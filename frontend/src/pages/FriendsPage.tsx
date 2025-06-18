import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, UserCheck, Search, Loader } from "lucide-react";
import type { Author } from "../types/models";
import { api } from "../services/api";
import { useAuth } from "../components/context/AuthContext";
import AuthorCard from "../components/AuthorCard";
import Input from "../components/ui/Input";
import AnimatedGradient from "../components/ui/AnimatedGradient";
import Card from "../components/ui/Card";

type FilterType = "friends" | "following" | "followers";

export const FriendsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [filter, setFilter] = useState<FilterType>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (currentUser) {
      fetchAuthors();
      loadAllCounts();
    }
  }, [filter, currentUser]);

  const loadAllCounts = async () => {
    if (!currentUser) return;
    
    try {
      const [friends, following, followers] = await Promise.all([
        api.getFriends(currentUser.id),
        api.getFollowing(currentUser.id),
        api.getFollowers(currentUser.id),
      ]);
      
      setFriendsCount(friends.length);
      setFollowingCount(following.length);
      setFollowersCount(followers.length);
    } catch (error) {
      console.error("Error loading counts:", error);
    }
  };

  const fetchAuthors = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      let fetchedAuthors: Author[] = [];

      switch (filter) {
        case "friends":
          fetchedAuthors = await api.getFriends(currentUser.id);
          break;
        case "following":
          fetchedAuthors = await api.getFollowing(currentUser.id);
          break;
        case "followers":
          fetchedAuthors = await api.getFollowers(currentUser.id);
          break;
      }

      setAuthors(fetchedAuthors);
    } catch (error) {
      console.error("Error fetching authors:", error);
      setAuthors([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowToggle = async (isFollowing: boolean) => {
    // Refresh the current list and counts after follow/unfollow action
    await Promise.all([
      fetchAuthors(),
      loadAllCounts(),
    ]);
  };

  const filteredAuthors = authors.filter(
    (author) =>
      author.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      author.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (author.github_username && author.github_username.toLowerCase().includes(searchQuery.toLowerCase()))
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
    <div className="w-full px-4 lg:px-6 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-1 mb-2">Connections</h1>
        <p className="text-text-2">Manage your social network</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
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
              {!isLoading && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {friendsCount}
                </span>
              )}
            </AnimatedGradient>
          ) : (
            <motion.div
              className="px-4 py-2 rounded-lg text-text-2 hover:text-text-1 hover:bg-glass-low transition-all flex items-center space-x-2 cursor-pointer flex-shrink-0"
              onClick={() => setFilter("friends")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Users size={18} />
              <span className="font-medium">Friends</span>
              {!isLoading && (
                <span className="ml-1 px-2 py-0.5 bg-glass-low rounded-full text-xs">
                  {friendsCount}
                </span>
              )}
            </motion.div>
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
            <motion.div
              className="px-4 py-2 rounded-lg text-text-2 hover:text-text-1 hover:bg-glass-low transition-all flex items-center space-x-2 cursor-pointer flex-shrink-0"
              onClick={() => setFilter("following")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserPlus size={18} />
              <span className="font-medium">Following</span>
              <span className="ml-1 px-2 py-0.5 bg-glass-low rounded-full text-xs">
                {followingCount}
              </span>
            </motion.div>
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
            <motion.div
              className="px-4 py-2 rounded-lg text-text-2 hover:text-text-1 hover:bg-glass-low transition-all flex items-center space-x-2 cursor-pointer flex-shrink-0"
              onClick={() => setFilter("followers")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserCheck size={18} />
              <span className="font-medium">Followers</span>
              <span className="ml-1 px-2 py-0.5 bg-glass-low rounded-full text-xs">
                {followersCount}
              </span>
            </motion.div>
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

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="glass-card-main rounded-full p-5 shadow-lg"
          >
            <Loader className="w-8 h-8 text-brand-500" />
          </motion.div>
        </div>
      ) : filteredAuthors.length === 0 ? (
        <Card variant="main" className="text-center py-16">
          <div className="text-text-2 mb-4">{getIcon()}</div>
          <h3 className="font-medium text-lg mb-2 text-text-1">
            {searchQuery ? "No results found" : `No ${filter} yet`}
          </h3>
          <p className="text-text-2 max-w-md mx-auto">
            {searchQuery
              ? `Try searching with a different term.`
              : getEmptyMessage()}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAuthors.map((author, index) => (
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
                  showActions={true}
                  onFollow={handleFollowToggle}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default FriendsPage;
