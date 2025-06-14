import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Github, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import Button from '../components/ui/Button';
import AnimatedButton from '../components/ui/AnimatedButton';
import AnimatedLogo from '../components/ui/AnimatedLogo';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    display_name: '',
    github_username: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Don't send password_confirm to backend
      const { password_confirm, ...signupData } = formData;
      await api.signup(signupData);
      setSuccess(true);
      // Wait a bit to show success message
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/accounts/github/login/`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative py-12">
      <BackgroundEffects />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="w-full max-w-lg lg:max-w-2xl mx-auto">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <AnimatedLogo variant="rainbow" size="md" />
            <h1 className="text-3xl font-bold text-text-1 mb-2">Create Account</h1>
            <p className="text-text-2">Join the Social Distribution network</p>
          </motion.div>

          {/* Signup Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="prominent" className="p-8">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center text-red-500"
                >
                  <AlertCircle className="mr-2" size={20} />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center text-green-500"
                >
                  <CheckCircle className="mr-2" size={20} />
                  <span className="text-sm">Account created! Redirecting to login...</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Username"
                    type="text"
                    icon={<User size={18} />}
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />

                  <Input
                    label="Display Name"
                    type="text"
                    placeholder="Your display name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  />
                </div>

                <Input
                  label="Email"
                  type="email"
                  icon={<Mail size={18} />}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />

                <Input
                  label="GitHub Username (optional)"
                  type="text"
                  icon={<Github size={18} />}
                  placeholder="Your GitHub username"
                  value={formData.github_username}
                  onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
                />

                <Input
                  label="Password"
                  type="password"
                  icon={<Lock size={18} />}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  autoComplete="new-password"
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  icon={<Lock size={18} />}
                  placeholder="Confirm your password"
                  value={formData.password_confirm}
                  onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                  autoComplete="new-password"
                  required
                />

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
                  disabled={success}
                >
                  Create Account
                </AnimatedButton>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-1"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 py-1 bg-white dark:bg-[rgb(var(--glass-rgb))] text-text-2 rounded-full border border-border-1">
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
                Sign up with GitHub
              </Button>

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