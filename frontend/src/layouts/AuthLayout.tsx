import React from 'react';
import { Outlet } from 'react-router-dom';
import BackgroundEffects from '../components/ui/BackgroundEffects';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-color)] relative flex flex-col">
      <BackgroundEffects />
      <div className="relative z-10 flex flex-col min-h-screen">
        <main className="flex-1 flex items-center justify-center px-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;