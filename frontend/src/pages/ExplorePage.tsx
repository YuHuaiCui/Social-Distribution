import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Search,
  Users,
  Hash,
  Grid3X3,
  List,
  Filter as FilterIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Entry, Author } from "../types/models";
import PostCard from "../components/PostCard";
import { extractUUID } from "../utils/extractId";
import AnimatedButton from "../components/ui/AnimatedButton";
import AnimatedGradient from "../components/ui/AnimatedGradient";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Avatar from "../components/Avatar/Avatar";
import Loader from "../components/ui/Loader";
import { useAuth } from "../components/context/AuthContext";
import { entryService, authorService, socialService } from "../services";

type ViewMode = "grid" | "list";
type ExploreTab = "trending" | "authors" | "categories" | "recent";

interface TrendingAuthor extends Author {
  follower_count?: number;
  post_count?: number;
  is_following?: boolean;
  follow_status?: "none" | "requesting" | "accepted" | "rejected";
}

interface Category {
  name: string;
  count: number;
  color: string;
}

export const ExplorePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ExploreTab>("trending");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<Entry[]>([]);
  const [authors, setAuthors] = useState<TrendingAuthor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingAuthors, setFollowingAuthors] = useState<Set<string>>(
    new Set()
  );
  const { user } = useAuth();
  const isAdmin = user?.is_staff || user?.is_superuser;

  // Helper function to get button text and variant based on follow status
  const getFollowButtonState = (author: TrendingAuthor) => {
    const followStatus =
      author.follow_status || (author.is_following ? "accepted" : "none");

    switch (followStatus) {
      case "accepted":
        return { text: "Following", variant: "secondary" as const };
      case "requesting":
        return { text: "Requested", variant: "secondary" as const };
      case "rejected":
      case "none":
      default:
        return { text: "Follow", variant: "primary" as const };
    }
  };

  useEffect(() => {
    fetchExploreData();
  }, [activeTab, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Utility to get consistent color for categories
  const getCategoryColor = (_categoryName: string, index: number) => {
    const colors = [
      "var(--primary-blue)",
      "var(--primary-purple)",
      "var(--primary-teal)",
      "var(--primary-pink)",
      "var(--primary-coral)",
      "var(--primary-violet)",
      "var(--primary-yellow)",
    ];
    return colors[index % colors.length];
  };

  const fetchExploreData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "trending") {
        // Fetch trending posts
        const response = await entryService.getTrendingEntries({
          page: 1,
          page_size: 20,
          ...(searchQuery && { search: searchQuery }),
        });
        setPosts(response.results || []);
      } else if (activeTab === "authors") {
        // Fetch authors with optional search
        const response = await authorService.getAuthors({
          is_active: true,
          ...(isAdmin ? {} : { is_approved: true }),
          page: 1,
          page_size: 20,
          ...(searchQuery && { search: searchQuery }),
        });
        const fetchedAuthors = response.results || [];

        // Map authors to TrendingAuthor type with default values
        const authorsWithDefaults = fetchedAuthors.map(
          (author: Author): TrendingAuthor => ({
            ...author,
            follower_count: (author as TrendingAuthor).follower_count ?? 0,
            post_count: (author as TrendingAuthor).post_count ?? 0,
          })
        );

        // Check follow status for each author if user is logged in
        if (user) {
          const authorsWithFollowStatus = await Promise.all(
            authorsWithDefaults.map(async (author) => {
              try {
                // Skip checking follow status for own profile
                if (extractUUID(user.id) === extractUUID(author.id)) {
                  return author;
                }

                const currentUserUrl =
                  user?.url ||
                  `${window.location.origin}/api/authors/${user?.id}`;
                const authorUrl =
                  author.url ||
                  `${window.location.origin}/api/authors/${author.id}`;

                const status = await socialService.checkFollowStatus(
                  currentUserUrl,
                  authorUrl
                );

                return {
                  ...author,
                  is_following: status.is_following,
                                  follow_status: (status.follow_status || "none") as
                  | "none"
                  | "requesting"
                  | "accepted"
                  | "rejected",
                };
              } catch (error) {
                console.error(
                  `Error checking follow status for author ${author.id}:`,
                  error
                );
                // Return author with default follow status on error
                return {
                  ...author,
                  is_following: false,
                  follow_status: "none" as const,
                };
              }
            })
          );
          setAuthors(authorsWithFollowStatus);
        } else {
          setAuthors(authorsWithDefaults);
        }
      } else if (activeTab === "categories") {
        // Fetch categories from the API
        const categoriesResponse = await entryService.getCategories();

        // Transform the response and add colors
        const categoriesWithColors = categoriesResponse.map((cat, index) => ({
          ...cat,
          color: getCategoryColor(cat.name, index),
        }));
        setCategories(categoriesWithColors);
      } else if (activeTab === "recent") {
        // Fetch recent posts
        const response = await entryService.getEntries({
          page: 1,
          page_size: 20,
          ...(searchQuery && { search: searchQuery }),
        });
        setPosts(response.results || []);
      }
    } catch (error) {
      console.error("Error fetching explore data:", error);
      // Set empty arrays on error to prevent showing stale data
      if (activeTab === "trending" || activeTab === "recent") {
        setPosts([]);
      } else if (activeTab === "authors") {
        setAuthors([]);
      } else if (activeTab === "categories") {
        setCategories([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowAuthor = async (authorId: string) => {
    setFollowingAuthors((prev) => new Set(prev).add(authorId));
    try {
      // Prevent following yourself
      const currentUserId = user?.id;
      if (
        currentUserId &&
        extractUUID(currentUserId) === extractUUID(authorId)
      ) {
        console.error("Cannot follow yourself");
        return;
      }

      console.log("Attempting to follow author:", authorId);
      console.log("Extracted UUID:", extractUUID(authorId));
      console.log("Current user ID:", currentUserId);

      // Check current follow status from backend to ensure accuracy
      const currentUserUrl =
        user?.url || `${window.location.origin}/api/authors/${user?.id}`;
      const authorUrl =
        authors.find((a) => a.id === authorId)?.url ||
        `${window.location.origin}/api/authors/${authorId}`;

      let followStatus;
      try {
        const status = await socialService.checkFollowStatus(
          currentUserUrl,
          authorUrl
        );
        followStatus = status.follow_status;
      } catch (error) {
        console.error("Error checking follow status:", error);
        // Fallback to current state from UI
        const currentAuthor = authors.find((author) => author.id === authorId);
        followStatus = currentAuthor?.is_following ? "accepted" : "none";
      }

      if (followStatus === "accepted") {
        // Unfollow the author
        await socialService.unfollowAuthor(extractUUID(authorId));

        // Update UI to show not following
        setAuthors((prev) =>
          prev.map((author) =>
            author.id === authorId
              ? {
                  ...author,
                  is_following: false,
                  follow_status: "none",
                  follower_count: (author.follower_count || 1) - 1,
                }
              : author
          )
        );
      } else if (followStatus === "none" || followStatus === "rejected") {
        // Follow the author
        await socialService.followAuthor(extractUUID(authorId));

        // Update UI to show pending/following (backend will determine the actual status)
        setAuthors((prev) =>
          prev.map((author) =>
            author.id === authorId
              ? {
                  ...author,
                  is_following: true, // Show as following for now
                  follow_status: "requesting", // Assume requesting until confirmed
                  follower_count: (author.follower_count || 0) + 1,
                }
              : author
          )
        );
              } else if (followStatus === "requesting") {
        // If already pending, don't do anything
        console.log("Follow request already pending");
        return;
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
      console.error("Author ID being followed:", authorId);
      console.error("Extracted UUID:", extractUUID(authorId));

      // Revert optimistic update on error by refetching the author data
      try {
        // Check the actual follow status from backend
        const currentUserUrl =
          user?.url || `${window.location.origin}/api/authors/${user?.id}`;
        const authorUrl =
          authors.find((a) => a.id === authorId)?.url ||
          `${window.location.origin}/api/authors/${authorId}`;
        const status = await socialService.checkFollowStatus(
          currentUserUrl,
          authorUrl
        );

        // Update the UI with the actual backend state
        setAuthors((prev) =>
          prev.map((author) =>
            author.id === authorId
              ? {
                  ...author,
                  is_following: status.is_following,
                  follow_status: status.follow_status,
                }
              : author
          )
        );
      } catch (statusError) {
        console.error("Error checking follow status for revert:", statusError);
        // If we can't check the status, just revert to original state
        setAuthors((prev) =>
          prev.map((author) =>
            author.id === authorId
              ? {
                  ...author,
                  // Revert to opposite of what we tried to do
                  is_following: !author.is_following,
                }
              : author
          )
        );
      }
      // Could show a toast notification here
    } finally {
      setFollowingAuthors((prev) => {
        const newSet = new Set(prev);
        newSet.delete(authorId);
        return newSet;
      });
    }
  };

  const tabs = [
    {
      id: "trending",
      label: "Trending",
      icon: TrendingUp,
      gradientColors: ["var(--primary-purple)", "var(--primary-pink)"],
    },
    {
      id: "authors",
      label: "Authors",
      icon: Users,
      gradientColors: ["var(--primary-teal)", "var(--primary-blue)"],
    },
    {
      id: "categories",
      label: "Categories",
      icon: Hash,
      gradientColors: ["var(--primary-yellow)", "var(--primary-coral)"],
    },
    {
      id: "recent",
      label: "Recent",
      icon: Sparkles,
      gradientColors: ["var(--primary-violet)", "var(--primary-purple)"],
    },
  ];

  return (
    <div className="w-full px-4 lg:px-6 py-6 max-w-7xl mx-auto flex flex-col flex-1">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <AnimatedGradient
              gradientColors={[
                "var(--primary-purple)",
                "var(--primary-pink)",
                "var(--primary-teal)",
                "var(--primary-violet)",
                "var(--primary-yellow)",
              ]}
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
              textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              duration={15}
            >
              <Compass className="w-6 h-6" />
            </AnimatedGradient>
            <div>
              <h1 className="text-2xl font-bold text-text-1">Explore</h1>
              <p className="text-sm text-text-2">
                Discover amazing content and people
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full md:w-96"
          >
            <div className="relative">
              <Input
                type="text"
                placeholder="Search posts, authors, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={18} />}
                className="pl-10"
              />
              <motion.div
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FilterIcon className="w-5 h-5 text-text-2 cursor-pointer hover:text-text-1" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-hide">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return isActive ? (
              <motion.div
                key={`${tab.id}-active`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AnimatedGradient
                  gradientColors={tab.gradientColors}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-md cursor-pointer flex-shrink-0"
                  textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center gap-2"
                  duration={20}
                  onClick={() => setActiveTab(tab.id as ExploreTab)}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </AnimatedGradient>
              </motion.div>
            ) : (
              <motion.div
                key={`${tab.id}-inactive`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium glass-card-subtle text-text-1 hover:text-text-1 transition-all cursor-pointer flex-shrink-0"
                onClick={() => setActiveTab(tab.id as ExploreTab)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </motion.div>
            );
          })}

          {/* View Mode Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="ml-auto flex items-center space-x-2"
          >
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-[var(--primary-violet)]/20 text-[var(--primary-violet)]"
                  : "text-text-2 hover:text-text-1"
              }`}
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-[var(--primary-violet)]/20 text-[var(--primary-violet)]"
                  : "text-text-2 hover:text-text-1"
              }`}
            >
              <List size={18} />
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader size="lg" message="Discovering content..." />
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {/* Trending Posts */}
              {activeTab === "trending" && (
                <motion.div
                  key="trending"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 gap-6 flex-1"
                      : "space-y-4 flex-1"
                  }
                >
                  {posts.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                      <TrendingUp className="w-16 h-16 text-text-2 mb-4" />
                      <h3 className="text-lg font-medium text-text-1 mb-2">
                        No trending posts yet
                      </h3>
                      <p className="text-text-2">
                        Check back later for trending content!
                      </p>
                    </div>
                  ) : (
                    posts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <PostCard post={post} />
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {/* Recent Posts */}
              {activeTab === "recent" && (
                <motion.div
                  key="recent"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 gap-6 flex-1"
                      : "space-y-4 flex-1"
                  }
                >
                  {posts.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                      <Sparkles className="w-16 h-16 text-text-2 mb-4" />
                      <h3 className="text-lg font-medium text-text-1 mb-2">
                        No recent posts
                      </h3>
                      <p className="text-text-2">
                        Be the first to share something!
                      </p>
                    </div>
                  ) : (
                    posts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <PostCard post={post} />
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {/* Authors Grid */}
              {activeTab === "authors" && (
                <motion.div
                  key="authors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1"
                >
                  {authors.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                      <Users className="w-16 h-16 text-text-2 mb-4" />
                      <h3 className="text-lg font-medium text-text-1 mb-2">
                        No authors found
                      </h3>
                      <p className="text-text-2">
                        Discover amazing creators as the community grows!
                      </p>
                    </div>
                  ) : (
                    authors.map((author, index) => (
                      <motion.div
                        key={author.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card
                          variant="main"
                          hoverable
                          className="p-6 bg-[rgba(var(--glass-rgb),0.4)] backdrop-blur-xl"
                        >
                          <div className="flex flex-col items-center text-center">
                            <Link
                              to={`/authors/${extractUUID(author.id)}`}
                              className="flex flex-col items-center text-center hover:opacity-80 transition-opacity"
                            >
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="mb-4"
                              >
                                <Avatar
                                  imgSrc={author.profileImage || author.profile_image}
                                  alt={author.displayName || author.display_name}
                                  size="xl"
                                />
                              </motion.div>

                              <h3 className="font-semibold text-lg text-text-1 mb-1 hover:underline">
                                {author.displayName || author.display_name}
                              </h3>

                              {author.bio && (
                                <p className="text-sm text-text-2 mb-4 line-clamp-2">
                                  {author.bio}
                                </p>
                              )}
                            </Link>

                            <div className="flex items-center space-x-4 mb-4 text-sm">
                              <div>
                                <span className="font-semibold text-text-1">
                                  {author.follower_count || 0}
                                </span>
                                <span className="text-text-2 ml-1">
                                  followers
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold text-text-1">
                                  {author.post_count || 0}
                                </span>
                                <span className="text-text-2 ml-1">posts</span>
                              </div>
                            </div>

                            <AnimatedButton
                              size="sm"
                              variant={getFollowButtonState(author).variant}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFollowAuthor(author.id);
                              }}
                              loading={followingAuthors.has(author.id)}
                              className="w-full"
                            >
                              {getFollowButtonState(author).text}
                            </AnimatedButton>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {/* Categories */}
              {activeTab === "categories" && (
                <motion.div
                  key="categories"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 flex-1"
                >
                  {categories.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                      <Hash className="w-16 h-16 text-text-2 mb-4" />
                      <h3 className="text-lg font-medium text-text-1 mb-2">
                        No categories yet
                      </h3>
                      <p className="text-text-2">
                        Categories will appear as people start posting!
                      </p>
                    </div>
                  ) : (
                    categories.map((category, index) => (
                      <motion.div
                        key={category.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Card
                          variant="main"
                          hoverable
                          className="p-6 cursor-pointer text-center h-full flex flex-col justify-center min-h-[160px] border-l-4 transition-all bg-[rgba(var(--glass-rgb),0.35)] backdrop-blur-lg"
                          style={{
                            borderLeftColor: category.color,
                          }}
                        >
                          <motion.div
                            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                            style={{
                              backgroundColor: `${category.color}20`,
                            }}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Hash size={24} style={{ color: category.color }} />
                          </motion.div>
                          <h3 className="font-semibold text-text-1 mb-1">
                            {category.name}
                          </h3>
                          <p className="text-sm text-text-2">
                            {category.count} posts
                          </p>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
