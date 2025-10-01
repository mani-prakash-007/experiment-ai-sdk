'use client'

import { signUpWithEmail, signInWithGitlab } from '@/utils/actions';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleEmailSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Basic client-side validation
    if (password !== confirmPassword || password.length < 6) {
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await signUpWithEmail(email, password);
      if (result?.success) {
        setShowConfirmation(true);
      }
    } catch (err: any) {
      // Handle any unexpected errors silently
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitlabLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      await signInWithGitlab();
    } catch (err: any) {
      // Handle redirect silently
      if (err?.message?.includes('NEXT_REDIRECT')) {
        return;
      }
    }
  };

  // Confirmation Component
  const ConfirmationView = () => (
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
  );

  // Signup Form Component
  const SignupFormView = () => (
    <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-gray-400">Sign up to get started</p>
      </div>

      {/* Email/Password Signup Form */}
      <form onSubmit={handleEmailSignup} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email"
          />
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
            required
            minLength={6}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your password"
          />
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
            required
            minLength={6}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Confirm your password"
          />
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
  );

  return (
    <div className="flex-1 flex min-h-screen justify-center items-center bg-black">
      {showConfirmation ? <ConfirmationView /> : <SignupFormView />}
    </div>
  );
}