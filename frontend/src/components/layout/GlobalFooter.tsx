import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Github, Heart } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import AnimatedGradient from '../ui/AnimatedGradient';

export const GlobalFooter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { showSuccess, showError } = useToast();
  const currentYear = new Date().getFullYear();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showError('Please enter your email');
      return;
    }

    setIsSubscribing(true);
    try {
      // Mock subscription
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccess('Thanks for subscribing! Check your email for confirmation.');
      setEmail('');
    } catch (error) {
      showError('Failed to subscribe. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="w-full mt-auto glass-card-prominent border-t border-glass-prominent">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Top Row: Brand, Links, and Subscribe */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left: Brand and Links */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Link to="/" className="flex items-center space-x-2 shrink-0">
                <AnimatedGradient
                  gradientColors={['var(--primary-purple)', 'var(--primary-pink)', 'var(--primary-teal)', 'var(--primary-violet)']}
                  className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
                  textClassName="text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  duration={20}
                >
                  S
                </AnimatedGradient>
                <span className="font-semibold text-text-1 whitespace-nowrap">Social Distribution</span>
              </Link>
              
              <nav className="flex items-center space-x-4 text-sm">
                <Link to="/about" className="text-text-2 hover:text-text-1 transition-colors whitespace-nowrap">
                  About
                </Link>
                <Link to="/docs" className="text-text-2 hover:text-text-1 transition-colors whitespace-nowrap">
                  Docs
                </Link>
                <Link to="/privacy" className="text-text-2 hover:text-text-1 transition-colors whitespace-nowrap">
                  Privacy
                </Link>
                <a 
                  href="https://github.com/CMPUT404" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-text-2 hover:text-text-1 transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  <Github size={14} className="shrink-0" />
                  GitHub
                </a>
              </nav>
            </div>

            {/* Right: Newsletter Subscription */}
            <form onSubmit={handleSubscribe} className="flex items-center">
              <div className="relative">
                <Mail 
                  size={20} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 z-10" 
                  strokeWidth={2}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Subscribe to updates"
                  className="w-64 pl-12 pr-4 py-3 bg-[rgba(var(--glass-rgb),0.5)] backdrop-blur-md border-2 border-[var(--border-1)] rounded-l-lg text-[var(--text-1)] placeholder:text-[var(--text-2)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-purple)]/40 focus:border-[var(--primary-purple)] hover:bg-[rgba(var(--glass-rgb),0.6)] transition-all shadow-inner"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubscribing}
                className={`group px-6 bg-gradient-to-r from-[var(--primary-purple)] to-[var(--primary-pink)] text-white font-medium rounded-r-lg transition-all whitespace-nowrap flex items-center gap-2 h-[52px] -ml-[1px] ${
                  isSubscribing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
                }`}
              >
                <span className="transition-all duration-200 group-hover:text-lg">
                  {isSubscribing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Subscribe
                    </>
                  )}
                </span>
                {!isSubscribing && (
                  <ArrowRight size={14} className="shrink-0 transition-all duration-200 group-hover:translate-x-1" />
                )}
              </button>
            </form>
          </div>

          {/* Bottom Row: Centered Copyright */}
          <div className="flex items-center justify-center text-sm text-text-2">
            <span>© {currentYear}</span>
            <Heart size={14} className="mx-1 text-[var(--primary-pink)] fill-current" />
            <span>CMPUT 404</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default GlobalFooter;