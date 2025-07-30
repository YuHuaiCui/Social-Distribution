import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ChevronDown,
  Check,
} from "lucide-react";
import type { Author } from "../types/models";
import AuthorCard from "./AuthorCard";
import Input from "./ui/Input";
import Loader from "./ui/Loader";
import Card from "./ui/Card";
import AnimatedButton from "./ui/AnimatedButton";
import { socialService } from "../services";

interface FollowListProps {
  authorId?: string;
  type: "followers" | "following";
  className?: string;
}

export const FollowList: React.FC<FollowListProps> = ({
  authorId,
  type,
  className = "",
}) => {
  const params = useParams();
  const targetAuthorId = authorId || params.authorId;

  const [users, setUsers] = useState<Author[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOption, setFilterOption] = useState<
    "all" | "mutual" | "verified"
  >("all");
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (targetAuthorId) {
      fetchUsers();
    }
  }, [targetAuthorId, type]);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, filterOption]);

  const fetchUsers = async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      if (!targetAuthorId) {
        console.error("No author ID provided");
        return;
      }

      let fetchedUsers: Author[] = [];

      // Make actual API calls using the social service
      if (type === "followers") {
        fetchedUsers = await socialService.getFollowers(targetAuthorId);
      } else if (type === "following") {
        fetchedUsers = await socialService.getFollowing(targetAuthorId);
      }

      if (loadMore) {
        setUsers((prev) => [...prev, ...fetchedUsers]);
      } else {
        setUsers(fetchedUsers);
      }

      // For now, disable pagination since we're loading all at once
      setHasMore(false);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      setUsers([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.displayName || user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.bio &&
            user.bio.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Additional filters
    switch (filterOption) {
      case "mutual":
        // In real app, filter by mutual follows
        filtered = filtered.filter((_, i) => i % 2 === 0);
        break;
      case "verified":
        // In real app, filter by verified status
        filtered = filtered.filter((_, i) => i % 3 === 0);
        break;
    }

    setFilteredUsers(filtered);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchUsers(true);
    }
  };

  const getEmptyMessage = () => {
    if (searchQuery) {
      return `No ${type} found matching "${searchQuery}"`;
    }

    switch (type) {
      case "followers":
        return "No followers yet. Share great content to attract followers!";
      case "following":
        return "Not following anyone yet. Explore and follow interesting people!";
    }
  };

  const filterOptions = [
    { value: "all", label: "All Users" },
    { value: "mutual", label: "Mutual Follows" },
    { value: "verified", label: "Verified Only" },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" message={`Loading ${type}...`} />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <motion.div
              className="w-12 h-12 rounded-full gradient-secondary flex items-center justify-center"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
              }}
              style={{
                background: "var(--gradient-secondary)",
                backgroundSize: "200% 200%",
              }}
            >
              <Users className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-text-1 capitalize">
                {type}
              </h2>
              <p className="text-sm text-text-2">
                {filteredUsers.length}{" "}
                {type === "followers"
                  ? "people follow this user"
                  : "people being followed"}
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder={`Search ${type}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>

          <div className="relative">
            <AnimatedButton
              variant="secondary"
              onClick={() => setShowFilter(!showFilter)}
              icon={<Filter size={16} />}
            >
              {filterOptions.find((opt) => opt.value === filterOption)?.label}
              <ChevronDown
                size={16}
                className={`ml-1 transition-transform ${
                  showFilter ? "rotate-180" : ""
                }`}
              />
            </AnimatedButton>

            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-48 glass-card-prominent rounded-lg shadow-lg overflow-hidden z-10"
                >
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilterOption(option.value as typeof filterOption);
                        setShowFilter(false);
                      }}
                      className="w-full px-4 py-2 text-left text-text-1 hover:bg-glass-low transition-colors flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      {filterOption === option.value && (
                        <Check
                          size={16}
                          className="text-[var(--primary-violet)]"
                        />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <Card variant="main" className="inline-block p-12">
            <Users className="w-16 h-16 text-text-2 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-1 mb-2">
              {getEmptyMessage()}
            </h3>
            {!searchQuery && type === "following" && (
              <AnimatedButton
                variant="primary"
                icon={<UserPlus size={16} />}
                className="mt-4"
              >
                Discover People
              </AnimatedButton>
            )}
          </Card>
        </motion.div>
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <AuthorCard
                    author={user}
                    variant="compact"
                    showBio={false}
                    showStats={false}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Load More */}
          {hasMore && filteredUsers.length >= 20 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 text-center"
            >
              <AnimatedButton
                variant="secondary"
                onClick={handleLoadMore}
                loading={isLoadingMore}
              >
                Load More
              </AnimatedButton>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

// Followers List Component
export const FollowersList: React.FC<Omit<FollowListProps, "type">> = (
  props
) => {
  return <FollowList {...props} type="followers" />;
};

// Following List Component
export const FollowingList: React.FC<Omit<FollowListProps, "type">> = (
  props
) => {
  return <FollowList {...props} type="following" />;
};

// Mutual Followers Component
interface MutualFollowersProps {
  authorId: string;
  currentUserId: string;
  className?: string;
}

export const MutualFollowers: React.FC<MutualFollowersProps> = ({
  authorId,
  currentUserId,
  className = "",
}) => {
  const [mutuals, setMutuals] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMutualFollowers();
  }, [authorId, currentUserId]);

  const fetchMutualFollowers = async () => {
    setIsLoading(true);
    try {
      // Mock data - in real app, fetch mutual followers
      const mockMutuals: Author[] = Array.from({ length: 3 }, (_, i) => ({
        type: "author" as const,
        id: `mutual-${i}`,
        url: `http://localhost:8000/api/authors/mutual-${i}/`,
        host: "http://localhost:8000",
        web: "http://localhost:3000",
        username: `mutual${i}`,
        email: `mutual${i}@example.com`,
        displayName: `Mutual Friend ${i}`,
        profileImage: `https://i.pravatar.cc/150?u=mutual${i}`,
        is_approved: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      setMutuals(mockMutuals);
    } catch (error) {
      console.error("Error fetching mutual followers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Loader size="sm" />
      </div>
    );
  }

  if (mutuals.length === 0) {
    return null;
  }

  return (
    <Card variant="subtle" className={`p-4 ${className}`}>
      <h3 className="text-sm font-medium text-text-2 mb-3">
        Followed by {mutuals.length} people you follow
      </h3>
      <div className="flex -space-x-2">
        {mutuals.slice(0, 5).map((mutual) => (
          <motion.div
            key={mutual.id}
            whileHover={{ scale: 1.1, zIndex: 10 }}
            className="relative"
          >
            <img
              src={mutual.profileImage}
              alt={mutual.displayName}
              className="w-8 h-8 rounded-full border-2 border-bg-1"
              title={mutual.displayName}
            />
          </motion.div>
        ))}
        {mutuals.length > 5 && (
          <div className="w-8 h-8 rounded-full bg-glass-low border-2 border-bg-1 flex items-center justify-center">
            <span className="text-xs text-text-2 font-medium">
              +{mutuals.length - 5}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default FollowList;
