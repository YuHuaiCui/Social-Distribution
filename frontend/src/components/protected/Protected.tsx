import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MinLoadingWrapper from "../ui/MinLoadingWrapper";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  console.log("🛡️ Protected Route: Checking access -",
    "\n  isAuthenticated:", isAuthenticated,
    "\n  loading:", loading,
    "\n  route:", window.location.pathname
  );

  // Use MinLoadingWrapper to ensure smooth transitions
  return (
    <MinLoadingWrapper isLoading={loading} message="Verifying access...">
      {isAuthenticated ? (
        <>
          {console.log("🛡️ Protected Route: Access granted")}
          {children}
        </>
      ) : (
        <>
          {console.log("🛡️ Protected Route: Access denied, redirecting to login")}
          <Navigate to="/" replace />
        </>
      )}
    </MinLoadingWrapper>
  );
};

export default ProtectedRoute;