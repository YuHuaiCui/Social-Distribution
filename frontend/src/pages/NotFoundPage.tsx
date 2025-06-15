import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, Compass } from 'lucide-react';
import AnimatedButton from '../components/ui/AnimatedButton';

export const NotFoundPage: React.FC = () => {
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

      {/* Floating Elements */}
      <div className="relative h-32 mb-12 overflow-visible">
        <motion.div
          className="absolute left-1/4 top-0"
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -30, -10, 0],
            rotate: [0, 15, -10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary-yellow)] to-[var(--primary-pink)] opacity-80 blur-md dark:opacity-40 dark:blur-xl" />
        </motion.div>
        <motion.div
          className="absolute right-1/4 top-8"
          animate={{
            x: [0, -40, 20, 0],
            y: [0, 20, 40, 0],
            rotate: [0, -20, 10, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--primary-teal)] to-[var(--primary-blue)] opacity-70 blur-lg dark:opacity-30 dark:blur-2xl" />
        </motion.div>
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-4"
          animate={{
            x: [0, -20, 30, 0],
            y: [0, 20, -25, 0],
            scale: [1, 1.3, 0.9, 1],
            opacity: [0.6, 0.8, 0.4, 0.6],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--primary-purple)] to-[var(--primary-violet)] opacity-60 blur-xl dark:opacity-25 dark:blur-3xl" />
        </motion.div>
        {/* Small floating elements */}
        <motion.div
          className="absolute left-[15%] top-16"
          animate={{
            x: [0, 50, 10, 0],
            y: [0, -40, -20, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-coral)] to-[var(--primary-pink)] opacity-70 blur-sm dark:opacity-20 dark:blur-lg" />
        </motion.div>
        <motion.div
          className="absolute right-[10%] top-20"
          animate={{
            x: [0, -30, 40, 0],
            y: [0, 30, -10, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 3,
          }}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary-yellow)] to-[var(--primary-coral)] opacity-60 blur-md dark:opacity-20 dark:blur-xl" />
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4"
      >
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
        
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-6 py-3 text-text-1 hover:text-[var(--primary-purple)] transition-colors"
        >
          <ArrowLeft size={20} />
          Go Back
        </button>
      </motion.div>

      {/* Search Suggestion */}
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

      {/* Animated dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-12 flex justify-center space-x-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-text-2"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default NotFoundPage;