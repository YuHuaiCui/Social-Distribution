import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeAuthentication = async () => {
      try {
        // Get the code from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (!code) {
          throw new Error("No authorization code found in the URL");
        }

        const statusResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/status/`,
          {
            credentials: "include",
          }
        );

        if (!statusResponse.ok) {
          throw new Error("Failed to check authentication status");
        }

        const statusData = await statusResponse.json();

        if (statusData.isAuthenticated) {
          // We're authenticated! Update local state and redirect
          login();
          navigate("/home", { replace: true });
        } else {
          // Not authenticated - we need to manually exchange the code

          // This is a fallback approach
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/auth/github/callback/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ code }),
              credentials: "include",
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Authentication failed");
          }

          const data = await response.json();
          if (data.success) {
            login();
            navigate("/home", { replace: true });
          } else {
            throw new Error("Authentication failed");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    completeAuthentication();
  }, [login, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-1">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-1 mb-2">
            Authentication Failed
          </h2>
          <p className="text-text-2 mb-6">{error}</p>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="px-6 py-2 bg-[var(--primary-purple)] text-white rounded-lg hover:bg-[var(--primary-purple)]/90 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-1">
      <div className="text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto relative">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--border-1)]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-[var(--primary-purple)] border-t-transparent animate-spin"></div>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-text-1 mb-2">
          Authenticating with GitHub
        </h2>
        <p className="text-text-2">Please wait while we complete your login...</p>
      </div>
    </div>
  );
}
