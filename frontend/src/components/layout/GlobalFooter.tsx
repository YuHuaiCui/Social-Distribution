import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Github, Heart, ExternalLink } from "lucide-react";
import AnimatedGradient from "../ui/AnimatedGradient";

export const GlobalFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto glass-card-prominent border-t border-glass-prominent backdrop-blur-xl">
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col gap-8">
          {/* Top Row: Brand and Links */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Brand Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Link
                to="/"
                className="flex items-center space-x-3 shrink-0 group"
              >
                <AnimatedGradient
                  gradientColors={[
                    "var(--primary-purple)",
                    "var(--primary-pink)",
                    "var(--primary-teal)",
                    "var(--primary-violet)",
                  ]}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                  textClassName="text-white font-bold text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  duration={20}
                >
                  S
                </AnimatedGradient>
                <div className="flex flex-col">
                  <span className="font-bold text-text-1 text-lg whitespace-nowrap">
                    Social Distribution
                  </span>
                  <span className="text-xs text-text-2 whitespace-nowrap">
                    Decentralized Social Network
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Navigation Links */}
            <motion.nav
              className="flex items-center space-x-8 text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Link
                to="/about"
                className="text-text-2 hover:text-text-1 transition-colors whitespace-nowrap font-medium hover:scale-105 transform duration-200"
              >
                About
              </Link>
              <Link
                to="/docs"
                className="text-text-2 hover:text-text-1 transition-colors whitespace-nowrap font-medium hover:scale-105 transform duration-200"
              >
                Documentation
              </Link>
              <Link
                to="/privacy"
                className="text-text-2 hover:text-text-1 transition-colors whitespace-nowrap font-medium hover:scale-105 transform duration-200"
              >
                Privacy Policy
              </Link>
              <a
                href="https://github.com/uofa-cmput404/s25-project-black"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-2 hover:text-text-1 transition-colors flex items-center gap-2 whitespace-nowrap font-medium hover:scale-105 transform duration-200 group"
              >
                <Github
                  size={16}
                  className="shrink-0 group-hover:rotate-12 transition-transform duration-200"
                />
                <span>GitHub</span>
                <ExternalLink
                  size={12}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                />
              </a>
            </motion.nav>
          </div>

          {/* Divider */}
          <motion.div
            className="w-full h-px bg-gradient-to-r from-transparent via-[var(--primary-purple)]/20 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />

          {/* Bottom Row: Centered Copyright */}
          <motion.div
            className="flex items-center justify-center text-sm text-text-2 gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <span>© {currentYear}</span>
            <Heart
              size={14}
              className="text-[var(--primary-pink)] fill-current animate-pulse"
            />
            <span className="font-medium">CMPUT 404 • S25 Project Black</span>
            <span className="text-text-3">•</span>
            <span className="text-text-3">Built with React & Django</span>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default GlobalFooter;
