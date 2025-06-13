import React, { createContext, useState, useContext, useEffect } from "react";
import type { ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  loading: boolean;
  user: any | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  loading: true,
  user: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any | null>(null);
  const [lastChecked, setLastChecked] = useState<number>(0);

  // Check if user is authenticated on mount and when lastChecked changes
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        // Check auth status with backend
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/status/`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(data.isAuthenticated);
          setUser(data.user || null);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [lastChecked]);

  const login = () => {
    setIsAuthenticated(true);
    // After successful login, fetch user info and update lastChecked to trigger the effect
    setLastChecked(Date.now());
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint
      await fetch(`${import.meta.env.VITE_API_URL}/accounts/logout/`, {
        method: "POST",
        credentials: "include",
      });

      setIsAuthenticated(false);
      setUser(null);
      // Update lastChecked to trigger the auth check effect
      setLastChecked(Date.now());
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, loading, user }}
    >
      {children}
    </AuthContext.Provider>
  );
};
