'use client'

import { signUpWithEmail, signInWithGitlab } from '@/utils/actions';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

type ValidationErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    if (password.length > 128) return 'Password was too long';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/\d/.test(password)) return 'Password must contain at least one number';
    if (!/[^\w\s]/.test(password)) return 'Password must contain at least one special character';
    return undefined;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;
    
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear all existing errors first
    setErrors({});
    
    // Step 1: Validate email first
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }
    
    // Step 2: Validate password length
    if (password.length > 128 || confirmPassword.length > 128) {
      const newErrors: ValidationErrors = {};
      if (password.length > 128) newErrors.password = 'Password was too long';
      if (confirmPassword.length > 128) newErrors.confirmPassword = 'Password was too long';
      setErrors(newErrors);
      return;
    }
    
    // Step 3: Run complete form validation for remaining checks
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await signUpWithEmail(email, password);
      
      if (result?.error) {
        // Handle specific Supabase auth errors
        const errorMessage = result.error.message.toLowerCase();
        if (errorMessage.includes('user already registered')) {
          setErrors({ general: 'An account with this email already exists. Please sign in instead.' });
        } else if (errorMessage.includes('password')) {
          setErrors({ password: 'Password does not meet requirements. Please choose a stronger password.' });
        } else if (errorMessage.includes('email')) {
          setErrors({ email: 'Invalid email address. Please check and try again.' });
        } else {
          setErrors({ general: 'Sign up failed. Please try again.' });
        }
        setIsLoading(false);
        return;
      }
      
      if (result?.success) {
        setShowConfirmation(true);
      }
    } catch {
      // Handle any unexpected errors
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
      setIsLoading(false);
    }
  };

  const handleGitlabLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors
    
    try {
      const result = await signInWithGitlab();
      
      if (result?.error) {
        setErrors({ general: 'GitLab sign in failed. Please try again.' });
        return;
      }
    } catch (err: unknown) {
      // Handle redirect silently
      if ((err as Error)?.message?.includes('NEXT_REDIRECT')) {
        return;
      }
      setErrors({ general: 'GitLab sign in failed. Please try again.' });
    }
  };



  return (
    <div className="flex-1 flex min-h-screen justify-center items-center bg-black">
      {showConfirmation ? (
        // Confirmation View
        <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md space-y-6 text-center">
          <div className="space-y-4">
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-white">Check Your Email</h1>
            
            <div className="space-y-3">
              <p className="text-gray-300">
                We&apos;ve sent a confirmation link to <span className="font-medium">{email}</span>
              </p>
              <p className="text-gray-400 text-sm">
                Please check your inbox and click the link to verify your account.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">
                Didn&apos;t receive the email? Check your spam folder.
              </p>
            </div>

            <Link
              href="/auth/signin"
              className="inline-block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Go to Sign In
            </Link>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              Already confirmed your email?{' '}
              <Link 
                href="/auth/signin" 
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      ) : (
        // Signup Form
        <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400">Sign up to get started</p>
          </div>

          {/* General Error Message */}
          {errors.general && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Email/Password Signup Form */}
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-700 focus:ring-blue-500'
                }`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                  errors.password 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-700 focus:ring-blue-500'
                }`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                  errors.confirmPassword 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-700 focus:ring-blue-500'
                }`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 active:scale-95"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
            </div>
          </div>

          {/* GitLab OAuth */}
          <form onSubmit={handleGitlabLogin}>
            <button 
              type="submit"
              className="w-full bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700 active:scale-95 text-white transition-all duration-200 flex items-center justify-center space-x-3"
            >
              <Image
                src="https://about.gitlab.com/images/press/gitlab-logo-500-rgb.svg"
                width={24}
                height={24}
                alt="GitLab logo"
                priority={true}
              />
              <span>Continue with GitLab</span>
            </button>
          </form>

          <div className="text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link 
                href="/auth/signin" 
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}