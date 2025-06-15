import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Github } from 'lucide-react';
import { useAuth } from '../components/context/AuthContext';
import { useToast } from '../components/context/ToastContext';
import { api } from '../services/api';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import Button from '../components/ui/Button';
import AnimatedButton from '../components/ui/AnimatedButton';
import AnimatedLogo from '../components/ui/AnimatedLogo';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import ThemeToggle from '../components/ui/ThemeToggle';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({
    username: '',
    password: '',
  });

  const validateForm = () => {
    const newErrors = {
      username: '',
      password: '',
    };

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return !newErrors.username && !newErrors.password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Please fix the form errors');
      return;
    }

    setIsLoading(true);

    try {
      // Try to login with the API
      await api.login(formData);
      login();
      showSuccess('Welcome back! Redirecting...');
      navigate('/home');
    } catch (err: any) {
      showError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/accounts/github/login/`;
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
            <h1 className="text-3xl font-bold text-text-1 mb-2">Welcome Back</h1>
            <p className="text-text-2">Sign in to your Social Distribution account</p>
          </motion.div>

          {/* Login Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="prominent" className="p-8">
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
                      if (errors.username) setErrors({ ...errors, username: '' });
                    }}
                    className={errors.username ? 'field-error' : ''}
                    required
                  />
                  {errors.username && (
                    <p className="mt-1 text-xs text-primary-pink">{errors.username}</p>
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
                      if (errors.password) setErrors({ ...errors, password: '' });
                    }}
                    className={errors.password ? 'field-error' : ''}
                    autoComplete="current-password"
                    required
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-primary-pink">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mr-2"
                    />
                    <span className="text-text-2">Remember me</span>
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
                className="w-full btn-github"
              >
                Sign in with GitHub
              </Button>

              <p className="text-center mt-6 text-text-2">
                Don't have an account?{' '}
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