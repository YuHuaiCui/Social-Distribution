import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Github } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/context/ToastContext';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import Button from '../components/ui/Button';
import AnimatedButton from '../components/ui/AnimatedButton';
import AnimatedLogo from '../components/ui/AnimatedLogo';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import ThemeToggle from '../components/ui/ThemeToggle';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password_confirm: '',
    displayName: '',
    github_username: '',
  });
  const [errors, setErrors] = useState({
    username: '',
    password: '',
    password_confirm: '',
    displayName: '',
  });

  const validateForm = () => {
    const newErrors = {
      username: '',
      password: '',
      password_confirm: '',
      displayName: '',
    };

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (formData.username.includes(' ')) {
      newErrors.username = 'Username cannot contain spaces';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.password_confirm) {
      newErrors.password_confirm = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.includes(' ')) {
      newErrors.displayName = 'Display name cannot contain spaces';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Please fix the form errors');
      return;
    }

    setIsLoading(true);

    try {
      // Backend expects the password_confirm field for validation
      await api.signup(formData);
      showSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      showError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center relative py-12">
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
        <div className="w-full max-w-lg lg:max-w-2xl mx-auto">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <AnimatedLogo variant="rainbow" size="md" />
            <h1 className="text-3xl font-bold text-text-1 mt-4 mb-2">Create Account</h1>
            <p className="text-text-2">Join the Social Distribution network</p>
          </motion.div>

          {/* Signup Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="prominent" className="p-8 bg-[rgba(var(--glass-rgb),0.75)] backdrop-blur-2xl">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">
                      Username <span className="field-required"></span>
                    </label>
                    <Input
                      type="text"
                      icon={<User size={18} />}
                      placeholder="Choose a username"
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
                      Display Name <span className="field-required"></span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Your display name"
                      value={formData.displayName}
                      onChange={(e) => {
                        setFormData({ ...formData, displayName: e.target.value });
                        if (errors.displayName) setErrors({ ...errors, displayName: '' });
                      }}
                      className={errors.displayName ? 'field-error' : ''}
                      required
                    />
                    {errors.displayName && (
                      <p className="mt-1 text-xs text-primary-pink">{errors.displayName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-1 mb-1.5">
                    GitHub Username (optional)
                  </label>
                  <Input
                    type="text"
                    icon={<Github size={18} />}
                    placeholder="Your GitHub username"
                    value={formData.github_username}
                    onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-1 mb-1.5">
                    Password <span className="field-required"></span>
                  </label>
                  <Input
                    type="password"
                    icon={<Lock size={18} />}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password) setErrors({ ...errors, password: '' });
                    }}
                    className={errors.password ? 'field-error' : ''}
                    autoComplete="new-password"
                    required
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-primary-pink">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-1 mb-1.5">
                    Confirm Password <span className="field-required"></span>
                  </label>
                  <Input
                    type="password"
                    icon={<Lock size={18} />}
                    placeholder="Confirm your password"
                    value={formData.password_confirm}
                    onChange={(e) => {
                      setFormData({ ...formData, password_confirm: e.target.value });
                      if (errors.password_confirm) setErrors({ ...errors, password_confirm: '' });
                    }}
                    className={errors.password_confirm ? 'field-error' : ''}
                    autoComplete="new-password"
                    required
                  />
                  {errors.password_confirm && (
                    <p className="mt-1 text-xs text-primary-pink">{errors.password_confirm}</p>
                  )}
                </div>

                <div className="text-sm text-text-2">
                  <p className="mb-2">Password must contain:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>At least 8 characters</li>
                    <li>Cannot be too similar to your personal information</li>
                    <li>Cannot be a commonly used password</li>
                  </ul>
                </div>

                <AnimatedButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  className="w-full"
                  disabled={isLoading}
                >
                  Create Account
                </AnimatedButton>
              </form>


              <p className="text-center mt-6 text-text-2 text-sm">
                By signing up, you agree to our{' '}
                <Link to="/terms" className="link-primary font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="link-secondary font-medium">
                  Privacy Policy
                </Link>
              </p>

              <p className="text-center mt-4 text-text-2">
                Already have an account?{' '}
                <Link 
                  to="/" 
                  className="gradient-text font-semibold transition-all hover:opacity-80"
                >
                  Sign in
                </Link>
              </p>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;