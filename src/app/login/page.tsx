'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Check if redirect query param exists
      const fromParam = searchParams.get('from');
      const redirectUrl = fromParam || data.redirectUrl || '/';
      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setError('A network error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          DVS Clinic
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign in to access your clinic role module
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            placeholder="Enter username"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-gray-500 text-sm">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
