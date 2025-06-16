import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, UserCheck, Search, Loader } from "lucide-react";
import type { Author } from "../types/models";
import AuthorCard from "../components/AuthorCard";
import Input from "../components/ui/Input";
import AnimatedGradient from "../components/ui/AnimatedGradient";
import Card from "../components/ui/Card";

type FilterType = "friends" | "following" | "followers";

// Mock data for demonstration
const generateMockAuthors = (): Author[] => {
  const names = [
    "Alice Chen",
    "Bob Smith",
    "Carol Johnson",
    "David Lee",
    "Emma Wilson",
    "Frank Brown",
    "Grace Davis",
    "Henry Martinez",
    "Iris Taylor",
    "Jack Anderson",
    "Katie Moore",
    "Liam Jackson",
  ];

  return names.map((name, index) => ({
    id: `author-${index}`,
    url: `http://localhost:8000/api/authors/author-${index}/`,
    username: name.toLowerCase().replace(" ", ""),
    email: `${name.toLowerCase().replace(" ", "")}@example.com`,
    display_name: name,
    bio: `Hi, I'm ${name}. I love sharing my thoughts on technology and innovation.`,
    profile_image: `https://i.pravatar.cc/150?u=${name}`,
    is_approved: true,
    is_active: true,
    created_at: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
    updated_at: new Date().toISOString(),
  }));
};

export const FriendsPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAuthors();
  }, [filter]);

  const fetchAuthors = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with API calls
      await new Promise((resolve) => setTimeout(resolve, 800));

      const allAuthors = generateMockAuthors();

      // Mock following/follower relationships
      const mockFollowingIds = new Set([
        "author-0",
        "author-1",
        "author-2",
        "author-3",
        "author-4",
      ]);
      const mockFollowerIds = new Set([
        "author-1",
        "author-2",
        "author-5",
        "author-6",
        "author-7",
      ]);

      setFollowingIds(mockFollowingIds);
      setFollowerIds(mockFollowerIds);

      // Filter based on selected tab
      let filteredAuthors: Author[] = [];

      switch (filter) {
        case "friends":
          // Friends are mutual followers
          filteredAuthors = allAuthors.filter(
            (author) =>
              mockFollowingIds.has(author.id) && mockFollowerIds.has(author.id)
          );
          break;
        case "following":
          filteredAuthors = allAuthors.filter((author) =>
            mockFollowingIds.has(author.id)
          );
          break;
        case "followers":
          filteredAuthors = allAuthors.filter((author) =>
            mockFollowerIds.has(author.id)
          );
          break;
      }

      setAuthors(filteredAuthors);
    } catch (error) {
      console.error("Error fetching authors:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowToggle = async (authorId: string) => {
    try {
      if (followingIds.has(authorId)) {
        // Unfollow
        const newFollowingIds = new Set(followingIds);
        newFollowingIds.delete(authorId);
        setFollowingIds(newFollowingIds);
      } else {
        // Follow
        const newFollowingIds = new Set(followingIds);
        newFollowingIds.add(authorId);
        setFollowingIds(newFollowingIds);
      }

      // In real implementation, make API call here
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const filteredAuthors = authors.filter(
    (author) =>
      author.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      author.username.toLowerCase().includes(searchQuery.toLowerCase())
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
                  {
                    authors.filter(
                      (a) => followingIds.has(a.id) && followerIds.has(a.id)
                    ).length
                  }
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
                  {
                    authors.filter(
                      (a) => followingIds.has(a.id) && followerIds.has(a.id)
                    ).length
                  }
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
                {followingIds.size}
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
                {followingIds.size}
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
                {followerIds.size}
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
                {followerIds.size}
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
                  isFollowing={followingIds.has(author.id)}
                  isFriend={
                    followingIds.has(author.id) && followerIds.has(author.id)
                  }
                  showFollowButton={
                    filter !== "followers" || !followingIds.has(author.id)
                  }
                  onFollowToggle={() => handleFollowToggle(author.id)}
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
