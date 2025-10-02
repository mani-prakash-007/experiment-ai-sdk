'use client'

import { signInWithEmail, signInWithGitlab } from '@/utils/actions';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

type ValidationErrors = {
  email?: string;
  password?: string;
  general?: string;
};

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    if (password.length < 6) return 'Password must be at least 6 characters';
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await signInWithEmail(email, password);
      
      if (result?.error) {
        // Handle specific Supabase auth errors
        const errorMessage = result.error.message.toLowerCase();
        if (errorMessage.includes('invalid login credentials')) {
          setErrors({ general: 'Invalid email or password. Please check your credentials and try again.' });
        } else if (errorMessage.includes('email not confirmed')) {
          setErrors({ general: 'Please check your email and click the confirmation link before signing in.' });
        } else if (errorMessage.includes('too many requests')) {
          setErrors({ general: 'Too many login attempts. Please wait a moment and try again.' });
        } else {
          setErrors({ general: 'Sign in failed. Please try again.' });
        }
        setIsLoading(false);
        return;
      }
      
      // Will redirect automatically on success
    } catch (err: any) {
      // Handle redirect silently
      if (err?.message?.includes('NEXT_REDIRECT')) {
        return;
      }
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
    } catch (err: any) {
      // Handle redirect silently  
      if (err?.message?.includes('NEXT_REDIRECT')) {
        return;
      }
      setErrors({ general: 'GitLab sign in failed. Please try again.' });
    }
  };

  return (
    <div className="flex-1 flex min-h-screen justify-center items-center bg-black">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        {/* General Error Message */}
        {errors.general && (
          <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{errors.general}</p>
          </div>
        )}

        {/* Email/Password Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 active:scale-95"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
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
            Don&apos;t have an account?{' '}
            <Link 
              href="/auth/signup" 
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}