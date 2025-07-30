import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  Users,
  Star,
  Hash,
  Settings,
  Server,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  count: number;
}

interface LeftSidebarProps {
  categories?: Category[];
  isLoadingCategories?: boolean;
  selectedCategory?: string | null;
  onCategoryClick?: (categoryId: string) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  categories = [],
  isLoadingCategories = false,
  selectedCategory = null,
  onCategoryClick,
}) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: "/home", icon: Home, label: "Home Feed" },
    { path: "/friends", icon: Users, label: "Friends" },
    { path: "/liked", icon: Star, label: "Liked" },
    { path: "/node-management", icon: Server, label: "Node Management" },
  ];

  const buttonVariants = {
    initial: { backgroundColor: "rgba(var(--glass-rgb), 0)" },
    hover: {
      backgroundColor: "rgba(var(--glass-rgb), 0.1)",
      scale: 1.02,
      transition: { duration: 0.2 },
    },
    tap: { scale: 0.98 },
  };

  return (
    <aside className="hidden md:block w-60 shrink-0">
      <div className="sticky top-24">
        <nav className="mb-8">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link to={item.path}>
                  <motion.div
                    className={`
                      flex items-center p-3 rounded-lg w-full text-left
                      ${
                        currentPath === item.path
                          ? "bg-[color:var(--glass-rgb)]/15 text-[color:var(--primary-purple)]"
                          : "text-[color:var(--text-1)]"
                      }
                    `}
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <item.icon size={18} className="mr-3" />
                    <span>{item.label}</span>
                  </motion.div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Categories section */}
        {categories.length > 0 && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="h-px bg-gradient-to-r from-transparent via-[color:var(--border-1)] to-transparent mb-4" />

            <h3 className="text-[color:var(--text-2)] text-sm font-medium mb-3 px-3">
              Categories
            </h3>

            {isLoadingCategories ? (
              <div className="px-3 py-2 text-sm text-[color:var(--text-2)]">
                Loading categories...
              </div>
            ) : (
              <ul className="space-y-1">
                {categories.map((category) => (
                  <li key={category.id}>
                    <motion.button
                      className={`
                        flex items-center justify-between w-full p-2 rounded-lg text-left
                        ${
                          selectedCategory === category.id
                            ? "text-[color:var(--primary-purple)] bg-[color:var(--glass-rgb)]/15"
                            : "text-[color:var(--text-1)]"
                        }
                      `}
                      onClick={() => onCategoryClick?.(category.id)}
                      variants={buttonVariants}
                      initial="initial"
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <div className="flex items-center">
                        <Hash size={16} className="mr-2" />
                        <span>{category.name}</span>
                      </div>
                      <span className="text-xs bg-[color:var(--glass-rgb)]/20 px-2 py-0.5 rounded-full">
                        {category.count}
                      </span>
                    </motion.button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-[color:var(--border-1)] to-transparent mb-4" />

        <Link to="/settings">
          <motion.div
            className={`
              flex items-center p-3 rounded-lg w-full text-left
              ${
                currentPath === "/settings"
                  ? "bg-[color:var(--glass-rgb)]/15 text-[color:var(--primary-purple)]"
                  : "text-[color:var(--text-1)]"
              }
            `}
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
            <Settings size={18} className="mr-3" />
            <span>Settings</span>
          </motion.div>
        </Link>
      </div>
    </aside>
  );
};

export default LeftSidebar;
