import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MinLoadingWrapper from "../ui/MinLoadingWrapper";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();


  // Use MinLoadingWrapper to ensure smooth transitions
  return (
    <MinLoadingWrapper isLoading={loading} message="Verifying access...">
      {isAuthenticated ? (
        <>
          {children}
        </>
      ) : (
        <>
          <Navigate to="/" replace />
        </>
      )}
    </MinLoadingWrapper>
  );
};

export default ProtectedRoute;