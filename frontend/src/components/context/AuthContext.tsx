import React, { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = () => {
    setIsAuthenticated(true);
    const expirationTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("authExpiration", expirationTime.toString());
  };
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("isAuthenticated");
  };

  useEffect(() => {
    const storedAuth = localStorage.getItem("isAuthenticated");
    const expirationTime = localStorage.getItem("authExpiration");

    if (storedAuth === "true" && expirationTime) {
      if (Date.now() < parseInt(expirationTime)) {
        setIsAuthenticated(true);
      } else {
        // Session expired
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("authExpiration");
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
