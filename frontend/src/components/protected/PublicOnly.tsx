import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLoadingScreen from "../ui/AuthLoadingScreen";

type PublicOnlyProps = {
  children: React.ReactNode;
};

/**
 * Component that only allows unauthenticated users to access its children.
 * Authenticated users are redirected to the home page.
 */
const PublicOnly: React.FC<PublicOnlyProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // If we're still loading, show a full-screen loading spinner
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // If authenticated, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  // Otherwise, render the children (login/signup page)
  return <>{children}</>;
};

export default PublicOnly;