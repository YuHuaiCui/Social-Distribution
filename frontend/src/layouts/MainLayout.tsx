import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import GlobalFooter from '../components/layout/GlobalFooter';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import SearchModal from '../components/SearchModal';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import AuthLoadingScreen from '../components/ui/AuthLoadingScreen';
import { useAuth } from '../components/context/AuthContext';

export const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Don't render anything until auth check is complete
  if (loading) {
    return <AuthLoadingScreen message="Loading application..." />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-color)] relative flex flex-col">
      <BackgroundEffects />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header onSearchClick={() => setIsSearchOpen(true)} />
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        
        <div className="flex-1 flex flex-col">
          <div className="layout-with-sidebars max-w-content-xl mx-auto flex-1 w-full">
            {/* Left Sidebar - only show when logged in and on desktop */}
            {user && (
              <aside className="hidden lg:block h-full overflow-y-auto">
                <div className="sticky top-0">
                  <LeftSidebar />
                </div>
              </aside>
            )}
            
            {/* Main Content */}
            <main className="flex-1 min-w-0 h-full overflow-y-auto pb-16 lg:pb-0">
              <div className="min-h-full w-full">
                <Outlet />
              </div>
            </main>
            
            {/* Right Sidebar - only show when logged in and on larger screens */}
            {user && (
              <aside className="hidden xl:block h-full overflow-y-auto">
                <div className="sticky top-0">
                  <RightSidebar />
                </div>
              </aside>
            )}
          </div>
          
          {/* Navigation Footer - visible on mobile only */}
          <div className="lg:hidden">
            <Footer />
          </div>
          
          {/* Global Footer - hidden on mobile, visible on desktop */}
          <div className="hidden lg:block">
            <GlobalFooter />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;