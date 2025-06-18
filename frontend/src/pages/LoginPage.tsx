import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Github } from "lucide-react";
import { useAuth } from "../components/context/AuthContext";
import { useToast } from "../components/context/ToastContext";
import { api } from "../services/api";
import BackgroundEffects from "../components/ui/BackgroundEffects";
import Button from "../components/ui/Button";
import AnimatedButton from "../components/ui/AnimatedButton";
import AnimatedLogo from "../components/ui/AnimatedLogo";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import ThemeToggle from "../components/ui/ThemeToggle";
import Checkbox from "../components/ui/Checkbox";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    username: "",
    password: "",
  });

  // Check if we're coming back from GitHub OAuth
  useEffect(() => {
    const checkGitHubAuth = async () => {
      console.log("🔐 LoginPage: Checking for GitHub auth...");
      
      // Check if we have a session cookie from Django
      const hasSession = document.cookie.includes("sessionid");
      
      // Check if URL contains GitHub OAuth callback indicators
      const urlParams = new URLSearchParams(window.location.search);
      const hasCode = urlParams.has('code');
      const hasState = urlParams.has('state');
      
      console.log("🔐 LoginPage: Auth indicators -",
        "\n  hasSession:", hasSession,
        "\n  hasCode:", hasCode,
        "\n  hasState:", hasState,
        "\n  cookies:", document.cookie,
        "\n  URL:", window.location.href
      );
      
      // Check if we already handled this (to prevent loops)
      const handled = sessionStorage.getItem('githubAuthHandled');
      
      if (handled === 'true') {
        console.log("🔐 LoginPage: Already handled GitHub auth, skipping");
        sessionStorage.removeItem('githubAuthHandled');
        return;
      }
      
      // If we have GitHub params or a Django session, check auth
      if ((hasCode && hasState) || (hasSession && !sessionStorage.getItem('authChecked'))) {
        console.log("🔐 LoginPage: GitHub auth detected, checking with backend...");
        try {
          // Mark as checked to prevent repeated checks
          sessionStorage.setItem('authChecked', 'true');
          
          // Check if we're now authenticated
          const response = await api.getAuthStatus();
          console.log("🔐 LoginPage: Backend auth response:", response);
          
          if (response.isAuthenticated) {
            console.log("🔐 LoginPage: User authenticated! Logging in...");
            // Mark as handled
            sessionStorage.setItem('githubAuthHandled', 'true');
            
            showSuccess("Welcome back!");
            await login(true, response.user || undefined);
            
            // Clear the URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            console.log("🔐 LoginPage: Navigating to /home");
            navigate("/home");
          } else {
            console.log("🔐 LoginPage: User not authenticated");
          }
        } catch (error) {
          console.error("🔐 LoginPage: Auth check failed:", error);
        }
      } else {
        console.log("🔐 LoginPage: No GitHub auth indicators found");
      }
    };

    checkGitHubAuth();
  }, []);

  const validateForm = () => {
    const newErrors = {
      username: "",
      password: "",
    };

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return !newErrors.username && !newErrors.password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError("Please fix the form errors");
      return;
    }

    setIsLoading(true);

    try {
      // Try to login with the API - include remember_me preference
      const loginData = {
        ...formData,
        remember_me: rememberMe,
      };
      const response = await api.login(loginData);

      // Call the AuthContext login function with the user data
      await login(rememberMe, response.user || undefined);

      showSuccess("Welcome back! Redirecting...");
      navigate("/home");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials.";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = () => {
    setIsGithubLoading(true);
    showSuccess("Redirecting to GitHub...");
    // Add a small delay to show the loading state
    setTimeout(() => {
      window.location.href = `${
        import.meta.env.VITE_API_URL
      }/accounts/github/login/`;
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <BackgroundEffects />

      {/* Theme Toggle - positioned at top right */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 right-4 z-20"
      >
        <ThemeToggle size="md" />
      </motion.div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="w-full max-w-lg mx-auto">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <AnimatedLogo variant="secondary" size="md" />
            <h1 className="text-3xl font-bold text-text-1 mt-4 mb-2">
              Welcome Back
            </h1>
            <p className="text-text-2">
              Sign in to your Social Distribution account
            </p>
          </motion.div>

          {/* Login Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              variant="prominent"
              className="p-8 bg-[rgba(var(--glass-rgb),0.75)] backdrop-blur-2xl"
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-1 mb-1.5">
                    Username <span className="field-required"></span>
                  </label>
                  <Input
                    type="text"
                    icon={<Mail size={18} />}
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => {
                      setFormData({ ...formData, username: e.target.value });
                      if (errors.username)
                        setErrors({ ...errors, username: "" });
                    }}
                    className={errors.username ? "field-error" : ""}
                    required
                  />
                  {errors.username && (
                    <p className="mt-1 text-xs text-primary-pink">
                      {errors.username}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-1 mb-1.5">
                    Password <span className="field-required"></span>
                  </label>
                  <Input
                    type="password"
                    icon={<Lock size={18} />}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password)
                        setErrors({ ...errors, password: "" });
                    }}
                    className={errors.password ? "field-error" : ""}
                    autoComplete="current-password"
                    required
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-primary-pink">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center cursor-pointer">
                    <Checkbox
                      checked={rememberMe}
                      onChange={setRememberMe}
                      size="md"
                      id="remember-me"
                    />
                    <span className="ml-2 text-text-2 select-none">
                      Remember me
                    </span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="link-secondary font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                <AnimatedButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  className="w-full"
                >
                  Sign In
                </AnimatedButton>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-1"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 py-1 bg-[rgba(var(--glass-rgb),0.8)] backdrop-blur-sm text-text-2 rounded-full border border-border-1">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="lg"
                icon={<Github size={20} />}
                onClick={handleGithubLogin}
                disabled={isGithubLoading}
                loading={isGithubLoading}
                className="w-full btn-github"
              >
                {isGithubLoading ? "Redirecting..." : "Sign in with GitHub"}
              </Button>

              <p className="text-center mt-6 text-text-2">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="gradient-text font-semibold transition-all hover:opacity-80"
                >
                  Sign up
                </Link>
              </p>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
