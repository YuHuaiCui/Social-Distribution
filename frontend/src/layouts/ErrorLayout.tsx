import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import GlobalFooter from '../components/layout/GlobalFooter';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import SearchModal from '../components/SearchModal';

export const ErrorLayout: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-color)] relative flex flex-col">
      <BackgroundEffects />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header onSearchClick={() => setIsSearchOpen(true)} />
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        
        {/* Full page content for error pages */}
        <main className="flex-1 flex items-center justify-center px-4">
          <Outlet />
        </main>
        
        <GlobalFooter />
      </div>
    </div>
  );
};

export default ErrorLayout;