import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLoadingScreen from "../ui/AuthLoadingScreen";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // If we're still loading, show a full-screen loading spinner
  if (loading) {
    return <AuthLoadingScreen message="Verifying access..." />;
  }

  // If we're authenticated, render the children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Otherwise, redirect to login
  return <Navigate to="/" replace />;
};

export default ProtectedRoute;
