'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface NavbarProps {
  user: {
    userId: number;
    username: string;
    role: string;
    name: string;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'Doctor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Receptionist':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Pharmacy':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const roles = user?.role
    ? user.role.split(',').map((r) => r.trim()).filter(Boolean)
    : [];
  const isAdmin = roles.includes('Admin');
  const isDoctor = roles.includes('Doctor') || isAdmin;
  const isReceptionist = roles.includes('Receptionist') || isAdmin;
  const isPharmacy = roles.includes('Pharmacy') || isAdmin;

  const accessibleCount = (isAdmin ? 1 : 0) + (isDoctor ? 1 : 0) + (isReceptionist ? 1 : 0) + (isPharmacy ? 1 : 0);
  const showNav = accessibleCount > 1 || isAdmin;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-gray-900">
                DVS Clinic
              </span>
            </Link>

            {/* Quick navigation bar for multi-role / admin users */}
            {user && showNav && (
              <nav className="hidden md:flex space-x-2 text-sm font-medium">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname === '/admin'
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Admin
                  </Link>
                )}
                {isDoctor && (
                  <Link
                    href="/doctor"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname === '/doctor'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Doctor Desk
                  </Link>
                )}
                {isReceptionist && (
                  <Link
                    href="/bills"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname === '/bills'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Billing &amp; Invoices
                  </Link>
                )}
                {isPharmacy && (
                  <Link
                    href="/pharmacy"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname === '/pharmacy'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Pharmacy Stock
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* User info & Sign out */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-sm flex-wrap gap-y-1">
                  <span className="font-semibold text-gray-900">{user.name}</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {roles.map((r) => (
                      <span
                        key={r}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getRoleBadgeColor(
                          r
                        )}`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
