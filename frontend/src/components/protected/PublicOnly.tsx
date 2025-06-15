import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MinLoadingWrapper from "../ui/MinLoadingWrapper";

type PublicOnlyProps = {
  children: React.ReactNode;
};

/**
 * Component that only allows unauthenticated users to access its children.
 * Authenticated users are redirected to the home page.
 */
const PublicOnly: React.FC<PublicOnlyProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Use MinLoadingWrapper to ensure smooth transitions
  return (
    <MinLoadingWrapper isLoading={loading} message="Loading...">
      {isAuthenticated ? (
        <Navigate to="/home" replace />
      ) : (
        <>{children}</>
      )}
    </MinLoadingWrapper>
  );
};

export default PublicOnly;