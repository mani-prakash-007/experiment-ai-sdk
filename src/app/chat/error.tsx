'use client';

interface ErrorPageProps {
  error?: Error;
  reset?: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-screen w-full">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-red-400 mb-2">Something went wrong</h1>
        <p className="text-gray-400 mb-6">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          className="px-6 py-2 rounded-xl font-medium bg-pink-700 text-white hover:bg-pink-600 shadow"
          onClick={() => reset?.()}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
