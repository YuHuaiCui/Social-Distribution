import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import GlobalFooter from "../components/layout/GlobalFooter";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import SearchModal from "../components/SearchModal";
import BackgroundEffects from "../components/ui/BackgroundEffects";
import MinLoadingWrapper from "../components/ui/MinLoadingWrapper";
import { useAuth } from "../components/context/AuthContext";

export const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <MinLoadingWrapper isLoading={loading} message="Loading application...">
      <div className="min-h-screen bg-[var(--bg-color)] relative flex flex-col">
        <BackgroundEffects />
        <div className="relative z-10 flex flex-col min-h-screen">
          <Header onSearchClick={() => setIsSearchOpen(true)} />
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
          />

          <div className="flex-1 flex flex-col">
            <div
              className={`${
                user ? "layout-with-sidebars" : "layout-no-sidebars"
              } max-w-content-xl mx-auto flex-1 w-full`}
            >
              {/* Left Sidebar - only show when logged in and on desktop */}
              {user && (
                <aside className="hidden lg:block h-full overflow-y-auto">
                  <div className="sticky top-0">
                    <LeftSidebar />
                  </div>
                </aside>
              )}

              {/* Main Content */}
              <main className="flex-1 min-w-0 flex flex-col overflow-y-auto pb-16 lg:pb-0">
                <div className="flex flex-col flex-1 w-full">
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
    </MinLoadingWrapper>
  );
};

export default MainLayout;
