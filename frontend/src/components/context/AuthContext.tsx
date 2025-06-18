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
      console.log("🔍 AuthContext: Starting auth check...");
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
          "🔍 AuthContext: Session state -",
          "\n  hasRememberMe:", hasRememberMe,
          "\n  sessionData:", !!sessionData,
          "\n  hasSession cookie:", hasSession,
          "\n  hasStoredToken:", !!hasStoredToken,
          "\n  lastChecked:", lastChecked,
          "\n  cookies:", document.cookie
        );

        // If we have a Django session cookie, we should check with the backend
        // This is important for GitHub OAuth where Django sets the session
        if (hasSession) {
          console.log("🔍 AuthContext: Django session found, will check with backend");
        }

        // Check if we have a valid session (either remember me or 24-hour session)
        let hasValidSession = false;
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            const now = Date.now();
            const sessionExpiry = parsed.expiry || 0;

            console.log("🔍 AuthContext: Session data parsed:", parsed);
            console.log("🔍 AuthContext: Session expiry check:", now < sessionExpiry);

            if (hasRememberMe || now < sessionExpiry) {
              hasValidSession = true;
            } else {
              // Session expired, clear it
              console.log("🔍 AuthContext: Session expired, clearing...");
              localStorage.removeItem("sessionData");
            }
          } catch {
            // Invalid session data, clear it
            console.log("🔍 AuthContext: Invalid session data, clearing...");
            localStorage.removeItem("sessionData");
          }
        }

        // Only skip auth check if there's absolutely no sign of authentication
        // IMPORTANT: Always check if we have a Django session cookie
        if (
          !hasRememberMe &&
          !hasSession &&
          !hasStoredToken &&
          !hasValidSession &&
          lastChecked === 0
        ) {
          console.log("🔍 AuthContext: No auth indicators found, skipping backend check");
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          return;
        }

        console.log("🔍 AuthContext: Checking auth status with backend...");
        // Check auth status with backend
        const response = await api.getAuthStatus();
        console.log("🔍 AuthContext: Backend response:", response);

        setIsAuthenticated(response.isAuthenticated);
        setUser(response.user || null);
        
        console.log("🔍 AuthContext: Auth state updated -",
          "\n  isAuthenticated:", response.isAuthenticated,
          "\n  user:", response.user?.username || "null"
        );
      } catch (error) {
        console.error("🔍 AuthContext: Auth check failed:", error);
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
        console.log("🔍 AuthContext: Auth check complete");
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
    } else {
      // If no user data provided, fetch it from the backend
      try {
        const response = await api.getAuthStatus();
        if (response.isAuthenticated && response.user) {
          setUser(response.user);
          userData = response.user;
        }
      } catch (error) {
        console.error("Failed to fetch user data after login:", error);
      }
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
      // Clear auth check flags
      sessionStorage.removeItem("authChecked");
      sessionStorage.removeItem("githubAuthHandled");
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
