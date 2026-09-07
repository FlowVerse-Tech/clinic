import React from 'react';
import Link from 'next/link';
import { getCurrentUser, getRoleHome } from '@/lib/auth';

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();
  const returnUrl = user ? getRoleHome(user.role) : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
          !
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Access Not Authorized
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Your account does not have permission to access this section of DVS Clinic. Each role is restricted to its designated module.
        </p>

        {user && (
          <div className="bg-gray-50 p-3 rounded text-xs text-gray-700 mb-6 border border-gray-200">
            Logged in as: <span className="font-semibold text-gray-900">{user.name}</span> ({user.role})
          </div>
        )}

        <div className="space-y-2">
          <Link
            href={returnUrl}
            className="block w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Go to My Assigned Module ({user?.role || 'Login'})
          </Link>
          <Link
            href="/login"
            className="block w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Switch Account
          </Link>
        </div>
      </div>
    </div>
  );
}
