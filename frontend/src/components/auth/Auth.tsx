import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function Auth() {
  const { isAuthenticated } = useAuth();
  function handleLogin() {
    window.location.href = `${import.meta.env.VITE_API_URL}/accounts/github/login/`;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left splash panel */}
      <div className="hidden lg:flex w-1/2 bg-black relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black to-gray-900"></div>
        <div className="relative z-10 text-center text-white">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto mb-6 border-4 border-white rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.415-4.033-1.415-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.42-1.305.762-1.605-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 013.003-.404c1.018.005 2.043.138 3.003.404 2.292-1.552 3.298-1.23 3.298-1.23.653 1.653.241 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.608-2.807 5.624-5.48 5.921.431.372.815 1.102.815 2.222v3.293c0 .32.218.694.825.576C20.565 21.796 24 17.298 24 12c0-6.627-5.373-12-12-12z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2">
              Welcome to Social Distribution
            </h2>
            <p className="text-gray-300 text-lg">
              Secure. Simple. Streamlined.
            </p>
          </div>
        </div>
        <div className="absolute top-10 left-10 w-20 h-20 border border-white/20 rounded-full"></div>
        <div className="absolute bottom-10 right-10 w-16 h-16 border border-white/20 rounded-full"></div>
        <div className="absolute top-1/3 right-20 w-2 h-2 bg-white rounded-full"></div>
        <div className="absolute bottom-1/3 left-20 w-2 h-2 bg-white rounded-full"></div>
      </div>

      {/* Right auth form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-8 bg-white">
        <div className="max-w-sm w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-black">
              Sign in with GitHub
            </h1>
            <p className="text-gray-600">
              Authenticate with your GitHub account and get started
            </p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-3"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.415-4.033-1.415-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.42-1.305.762-1.605-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 013.003-.404c1.018.005 2.043.138 3.003.404 2.292-1.552 3.298-1.23 3.298-1.23.653 1.653.241 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.608-2.807 5.624-5.48 5.921.431.372.815 1.102.815 2.222v3.293c0 .32.218.694.825.576C20.565 21.796 24 17.298 24 12c0-6.627-5.373-12-12-12z"
                clipRule="evenodd"
              />
            </svg>
            Continue with GitHub
          </button>
          <p className="text-center text-sm text-gray-500">
            By clicking continue, you agree to our{" "}
            <a
              href="#"
              className="underline hover:text-black transition-colors"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="underline hover:text-black transition-colors"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
