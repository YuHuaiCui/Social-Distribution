import React, { createContext, useState, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import type { Author } from "../../types/models";
import { api } from "../../services/api";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (rememberMe?: boolean, userData?: Author) => Promise<void>;
  logout: () => void;
  loading: boolean;
  user: Author | null;
  updateUser: (user: Author) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: async () => {},
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

        

        // Check for active session with expiry
        const sessionData = localStorage.getItem("sessionData");
        const hasRememberMe = localStorage.getItem("rememberMe") === "true";
        const hasSession = document.cookie.includes("sessionid");
        const hasStoredToken =
          localStorage.getItem("authToken") ||
          sessionStorage.getItem("authToken");

        console.log(
          "Auth check - hasRememberMe:",
          hasRememberMe,
          "sessionData:",
          !!sessionData,
          "hasSession:",
          hasSession,
          "hasStoredToken:",
          !!hasStoredToken
        );

        // Check if we have a valid session (either remember me or 24-hour session)
        let hasValidSession = false;
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            const now = Date.now();
            const sessionExpiry = parsed.expiry || 0;

            if (hasRememberMe || now < sessionExpiry) {
              hasValidSession = true;
            } else {
              // Session expired, clear it

              localStorage.removeItem("sessionData");
            }
          } catch {
            // Invalid session data, clear it

            localStorage.removeItem("sessionData");
          }
        }

        // Only skip auth check if there's absolutely no sign of authentication
        if (
          !hasRememberMe &&
          !hasSession &&
          !hasStoredToken &&
          !hasValidSession &&
          lastChecked === 0
        ) {
          // User didn't choose to be remembered and has no active session or tokens, and this is initial load
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
        console.error("Auth status check failed:", error);
        // If we get a 401/403, the interceptor will handle redirect
        // For other errors, just set as not authenticated
        setIsAuthenticated(false);
        setUser(null);

        // Clear any stored auth tokens and session data
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
        localStorage.removeItem("sessionData");

        // If auth check fails, also clear rememberMe
        localStorage.removeItem("rememberMe");
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [lastChecked]);

  // Periodic session expiry check
  useEffect(() => {
    const checkSessionExpiry = () => {
      const sessionData = localStorage.getItem("sessionData");
      const hasRememberMe = localStorage.getItem("rememberMe") === "true";

      if (sessionData && !hasRememberMe && isAuthenticated) {
        try {
          const parsed = JSON.parse(sessionData);
          const now = Date.now();
          const sessionExpiry = parsed.expiry || 0;

          if (now >= sessionExpiry) {
            // Session expired, log out user
            console.log("Session expired, logging out user");
            logout();
          }
        } catch {
          // Invalid session data, log out user
          console.log("Invalid session data, logging out user");
          logout();
        }
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkSessionExpiry, 5 * 60 * 1000);

    // Also check immediately
    checkSessionExpiry();

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = async (rememberMe: boolean = false, userData?: Author) => {
    console.log(
      "Login called - rememberMe:",
      rememberMe,
      "userData:",
      !!userData
    );

    setIsAuthenticated(true);

    // If user data is provided, set it immediately
    if (userData) {
      setUser(userData);
    }

    // Create session data with expiry
    const now = Date.now();
    const sessionExpiry = now + 24 * 60 * 60 * 1000; // 24 hours from now

    const sessionData = {
      timestamp: now,
      expiry: sessionExpiry,
      userId: userData?.id,
    };

    console.log("Creating session data:", sessionData);
    localStorage.setItem("sessionData", JSON.stringify(sessionData)); // Store auth persistence preference
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
      console.log("Remember me enabled");
    } else {
      localStorage.removeItem("rememberMe");
      console.log("Remember me disabled - 24 hour session created");
    }

    // Update auth state immediately for better performance
    setLastChecked(Date.now());
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint
      await api.logout();

      setIsAuthenticated(false);
      setUser(null);
      // Clear remember me preference
      localStorage.removeItem("rememberMe");
      // Clear session data
      localStorage.removeItem("sessionData");
      // Clear any stored auth tokens
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("authToken");
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
