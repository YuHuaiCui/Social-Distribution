import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, Compass, LogIn, UserPlus } from 'lucide-react';
import AnimatedButton from '../components/ui/AnimatedButton';
import { useAuth } from '../components/context/AuthContext';

export const NotFoundPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="w-full max-w-4xl mx-auto text-center">
      {/* 404 Animation */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <motion.h1 
          className="text-[150px] md:text-[200px] font-bold leading-none"
          style={{
            background: 'linear-gradient(135deg, var(--primary-purple) 0%, var(--primary-pink) 50%, var(--primary-teal) 100%)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          404
        </motion.h1>
      </motion.div>

      {/* Error Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-semibold text-text-1 mb-4">
          Oops! Page Not Found
        </h2>
        <p className="text-lg text-text-2 max-w-lg mx-auto">
          The page you're looking for seems to have wandered off into the distributed void. 
          Let's get you back on track!
        </p>
      </motion.div>

      {/* Animated dots - moved here */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mb-8 flex justify-center space-x-3"
      >
        {[
          ['var(--primary-purple)', 'var(--primary-pink)'],
          ['var(--primary-teal)', 'var(--primary-blue)'],
          ['var(--primary-yellow)', 'var(--primary-coral)']
        ].map((colors, i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
            }}
            animate={{
              y: [0, -12, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        {isAuthenticated ? (
          <>
            <Link to="/home">
              <AnimatedButton
                variant="primary"
                size="lg"
                icon={<Home size={20} />}
              >
                Go Home
              </AnimatedButton>
            </Link>
            
            <Link to="/explore">
              <AnimatedButton
                variant="secondary"
                size="lg"
                icon={<Compass size={20} />}
              >
                Explore
              </AnimatedButton>
            </Link>
          </>
        ) : (
          <>
            <Link to="/">
              <AnimatedButton
                variant="primary"
                size="lg"
                icon={<LogIn size={20} />}
              >
                Sign In
              </AnimatedButton>
            </Link>
            
            <Link to="/signup">
              <AnimatedButton
                variant="secondary"
                size="lg"
                icon={<UserPlus size={20} />}
              >
                Sign Up
              </AnimatedButton>
            </Link>
          </>
        )}
        
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-6 py-3 text-text-1 hover:text-[var(--primary-purple)] transition-colors"
        >
          <ArrowLeft size={20} />
          Go Back
        </button>
      </motion.div>

      {/* Search Suggestion - only for authenticated users */}
      {isAuthenticated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12 glass-card-subtle p-6 rounded-2xl max-w-md mx-auto"
        >
          <div className="flex items-center justify-center gap-2 text-text-2 mb-2">
            <Search size={18} />
            <span className="text-sm">Looking for something specific?</span>
          </div>
          <p className="text-xs text-text-2">
            Try using the search bar in the header to find what you need
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default NotFoundPage;