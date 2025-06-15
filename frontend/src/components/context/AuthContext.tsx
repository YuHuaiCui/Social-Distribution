import React, { createContext, useState, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import type { Author } from "../../types/models";
import { api } from "../../services/api";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (rememberMe?: boolean) => void;
  logout: () => void;
  loading: boolean;
  user: Author | null;
  updateUser: (user: Author) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  loading: true,
  user: null,
  updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<Author | null>(null);
  const [lastChecked, setLastChecked] = useState<number>(0);

  // Check if user is authenticated on mount and when lastChecked changes
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        
        // Check if we should skip auth check (no rememberMe and no session)
        const hasRememberMe = localStorage.getItem('rememberMe') === 'true';
        const hasSession = document.cookie.includes('sessionid');
        
        if (!hasRememberMe && !hasSession) {
          // User didn't choose to be remembered and has no active session
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Check auth status with backend
        const response = await api.getAuthStatus();
        
        setIsAuthenticated(response.isAuthenticated);
        setUser(response.user || null);
      } catch (error) {
        // If we get a 401/403, the interceptor will handle redirect
        // For other errors, just set as not authenticated
        setIsAuthenticated(false);
        setUser(null);
        
        // Clear any stored auth tokens
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        
        // If auth check fails, also clear rememberMe
        localStorage.removeItem('rememberMe');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [lastChecked]);

  const login = (rememberMe: boolean = false) => {
    setIsAuthenticated(true);
    // Store auth persistence preference
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
    }
    // After successful login, fetch user info and update lastChecked to trigger the effect
    setLastChecked(Date.now());
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint
      await api.logout();
      
      setIsAuthenticated(false);
      setUser(null);
      // Clear remember me preference
      localStorage.removeItem('rememberMe');
      // Clear any stored auth tokens
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      // Update lastChecked to trigger the auth check effect
      setLastChecked(Date.now());
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateUser = (updatedUser: Author) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, loading, user, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};