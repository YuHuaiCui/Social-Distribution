import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '../components/context/ToastContext';
import { api } from '../services/api';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import Button from '../components/ui/Button';
import AnimatedLogo from '../components/ui/AnimatedLogo';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import ThemeToggle from '../components/ui/ThemeToggle';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      showError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual password reset API call
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      setIsSubmitted(true);
      showSuccess('Password reset link sent to your email');
    } catch (error) {
      showError('Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
            <AnimatedLogo variant="primary" size="md" />
            <h1 className="text-3xl font-bold text-text-1 mt-4 mb-2">
              {isSubmitted ? 'Check Your Email' : 'Forgot Password?'}
            </h1>
            <p className="text-text-2">
              {isSubmitted 
                ? 'We\'ve sent you instructions to reset your password'
                : 'No worries, we\'ll send you reset instructions'}
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="prominent" className="p-8 bg-[rgba(var(--glass-rgb),0.75)] backdrop-blur-2xl">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      icon={<Mail size={18} />}
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    loading={isLoading}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-[var(--primary-violet)] bg-opacity-20 rounded-full flex items-center justify-center">
                    <Mail className="w-8 h-8 text-[var(--primary-violet)]" />
                  </div>
                  <p className="text-text-2">
                    If an account exists for <span className="font-medium text-text-1">{email}</span>, 
                    you will receive a password reset link shortly.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail('');
                    }}
                    className="w-full"
                  >
                    Try Another Email
                  </Button>
                </div>
              )}

              <div className="mt-6 text-center">
                <Link
                  to="/"
                  className="inline-flex items-center text-sm text-[var(--primary-violet)] hover:text-[var(--primary-purple)] transition-colors"
                >
                  <ArrowLeft size={16} className="mr-1" />
                  Back to Sign In
                </Link>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;