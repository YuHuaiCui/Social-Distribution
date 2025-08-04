import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Compass, PlusCircle, MessageCircle, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCreatePost } from "../context/CreatePostContext";

export const Footer: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { openCreatePost } = useCreatePost();

  const navItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: Compass, label: "Explore", path: "/explore" },
    { icon: PlusCircle, label: "Create", path: null, action: openCreatePost },
    { icon: MessageCircle, label: "Inbox", path: "/inbox" },
    {
      icon: User,
      label: "Profile",
      path: user ? `/authors/${user.id}` : "/login",
    },
  ];

  const isActive = (path: string | null) => {
    if (!path) return false;
    return location.pathname === path;
  };

  return (
    <footer className="sticky bottom-0 z-dropdown glass-card-prominent border-t border-glass-prominent mt-auto backdrop-blur-xl">
      <nav className="container mx-auto px-6">
        <ul className="flex justify-around items-center py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            const content = (
              <motion.div
                className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 relative ${
                  active
                    ? "text-[var(--primary-purple)] bg-[var(--primary-purple)]/10"
                    : "text-text-2 hover:text-text-1 hover:bg-[var(--primary-purple)]/5"
                }`}
                whileHover={{
                  scale: 1.05,
                  y: -2,
                }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={active ? { y: [0, -2, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  {active && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--primary-purple)] shadow-lg"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                </motion.div>
                <span
                  className={`text-xs mt-1.5 font-medium transition-all ${
                    active ? "text-[var(--primary-purple)]" : "text-text-2"
                  }`}
                >
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-[var(--primary-purple)] shadow-sm"
                    layoutId="footerIndicator"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            );

            if (item.path) {
              return (
                <li key={item.label} className="flex-1">
                  <Link to={item.path} className="relative block">
                    {content}
                  </Link>
                </li>
              );
            } else {
              return (
                <li key={item.label} className="flex-1">
                  <button
                    onClick={() => item.action?.()}
                    className="relative block w-full"
                    aria-label={item.label}
                  >
                    {content}
                  </button>
                </li>
              );
            }
          })}
        </ul>
      </nav>
    </footer>
  );
};

export default Footer;
