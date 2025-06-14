import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import Header from '../components/layout/Header';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import { useCreatePost } from '../components/context/CreatePostContext';

export const MainLayout: React.FC = () => {
  const { openCreatePost } = useCreatePost();

  return (
    <div className="min-h-screen bg-[var(--bg-color)] relative">
      <BackgroundEffects />
      <div className="relative z-10">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Outlet />
        </main>
      </div>
      
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={openCreatePost}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50"
        style={{
          background: 'linear-gradient(135deg, var(--primary-yellow) 0%, var(--primary-pink) 25%, var(--primary-purple) 50%, var(--primary-teal) 75%, var(--primary-yellow) 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient-animation 3s ease infinite',
        }}
      >
        <Plus size={24} className="text-white" />
      </motion.button>
    </div>
  );
};

export default MainLayout;