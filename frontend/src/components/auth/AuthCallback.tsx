import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

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
          console.log(
            "Not authenticated yet, trying to exchange code manually"
          );

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
      } finally {
        setIsProcessing(false);
      }
    };

    completeAuthentication();
  }, [login, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl">Authentication Error</div>
          <p className="mt-4 text-gray-600">{error}</p>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-xl mb-4">Processing authentication...</div>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto"></div>
      </div>
    </div>
  );
}
