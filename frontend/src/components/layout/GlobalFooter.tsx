import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Github, Heart } from "lucide-react";
import AnimatedGradient from "../ui/AnimatedGradient";

export const GlobalFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto glass-card-prominent border-t border-glass-prominent">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Top Row: Brand and Links */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <Link to="/" className="flex items-center space-x-2 shrink-0">
              <AnimatedGradient
                gradientColors={[
                  "var(--primary-purple)",
                  "var(--primary-pink)",
                  "var(--primary-teal)",
                  "var(--primary-violet)",
                ]}
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
                textClassName="text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                duration={20}
              >
                S
              </AnimatedGradient>
              <span className="font-semibold text-text-1 whitespace-nowrap">
                Social Distribution
              </span>
            </Link>

            <nav className="flex items-center space-x-4 text-sm">
              <Link
                to="/about"
                className="text-text-2 hover:text-text-1 transition-colors whitespace-nowrap"
              >
                About
              </Link>
              <Link
                to="/docs"
                className="text-text-2 hover:text-text-1 transition-colors whitespace-nowrap"
              >
                Docs
              </Link>
              <Link
                to="/privacy"
                className="text-text-2 hover:text-text-1 transition-colors whitespace-nowrap"
              >
                Privacy
              </Link>
              <a
                href="https://github.com/uofa-cmput404/s25-project-black"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-2 hover:text-text-1 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <Github size={14} className="shrink-0" />
                GitHub
              </a>
            </nav>
          </div>

          {/* Bottom Row: Centered Copyright */}
          <div className="flex items-center justify-center text-sm text-text-2">
            <span>© {currentYear}</span>
            <Heart
              size={14}
              className="mx-1 text-[var(--primary-pink)] fill-current"
            />
            <span>CMPUT 404 • S25 Project Black</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default GlobalFooter;
