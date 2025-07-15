import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock } from "lucide-react";
// @ts-ignore - Github icon may show as deprecated but still works
import { Github } from "lucide-react";
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
      
      // Check if we have a session cookie from Django
      const hasSession = document.cookie.includes("sessionid");
      
      // Check if URL contains GitHub OAuth callback indicators
      const urlParams = new URLSearchParams(window.location.search);
      const hasCode = urlParams.has('code');
      const hasState = urlParams.has('state');
      
      
      // Check if we already handled this (to prevent loops)
      const handled = sessionStorage.getItem('githubAuthHandled');
      
      if (handled === 'true') {
        sessionStorage.removeItem('githubAuthHandled');
        return;
      }
      
      // Check if we just came from GitHub OAuth (has params) OR if we need to check existing session
      const githubAuthPending = sessionStorage.getItem('githubAuthPending') === 'true';
      const shouldCheckAuth = (hasCode && hasState) || 
                            (hasSession && !sessionStorage.getItem('authChecked')) ||
                            (!sessionStorage.getItem('authChecked') && document.referrer.includes('github.com')) ||
                            (githubAuthPending && !sessionStorage.getItem('authChecked'));
      
      
      if (shouldCheckAuth) {
        try {
          // Mark as checked to prevent repeated checks
          sessionStorage.setItem('authChecked', 'true');
          
          // Add a small delay for GitHub OAuth to ensure Django has processed the auth
          if (hasCode && hasState) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Check if we're now authenticated
          const response = await api.getAuthStatus();
          
          if (response.isAuthenticated) {
            // Mark as handled and clear pending flag
            sessionStorage.setItem('githubAuthHandled', 'true');
            sessionStorage.removeItem('githubAuthPending');
            
            showSuccess("Welcome back!");
            
            // Ensure login completes before navigating
            await login(true, response.user || undefined);
            
            // Clear the URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Small delay to ensure state updates propagate
            setTimeout(() => {
              navigate("/home");
            }, 100);
          } else {
            // Clear the pending flag if auth failed
            sessionStorage.removeItem('githubAuthPending');
            
            // If we have GitHub params but not authenticated, Django might still be processing
            if (hasCode && hasState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        } catch (error) {
        }
      } else {
      }
    };

    checkGitHubAuth();
    
    // Cleanup function to clear authChecked when component unmounts
    return () => {
      sessionStorage.removeItem('authChecked');
    };
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

      if (
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      (err as any).response?.status === 403 &&
      (err as any).response?.data?.message?.includes("approval")
    ) {
      showError("Your account is awaiting admin approval.");
    } else {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials.";
      showError(errorMessage);
    }

    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = () => {
    setIsGithubLoading(true);
    showSuccess("Redirecting to GitHub...");
    
    // Set a flag to indicate GitHub auth is pending
    sessionStorage.setItem('githubAuthPending', 'true');
    
    // Add a small delay to show the loading state
    setTimeout(() => {
      window.location.href = `${import.meta.env.VITE_API_URL}/accounts/github/login/`;
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
