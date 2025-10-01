'use client'

import { signInWithEmail, signInWithGitlab } from '@/utils/actions';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signInWithEmail(email, password);
      // Will redirect automatically on success
    } catch (err: any) {
      // Handle redirect silently
      if (err?.message?.includes('NEXT_REDIRECT')) {
        return;
      }
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

  return (
    <div className="flex-1 flex min-h-screen justify-center items-center bg-black">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        {/* Email/Password Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
            />
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