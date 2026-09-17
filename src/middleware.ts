import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dvs_clinic_default_secret_key_fallback_2026'
);

const SESSION_COOKIE_NAME = 'clinic_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected paths
  const isDoctorRoute = pathname.startsWith('/doctor');
  const isBillsRoute = pathname.startsWith('/bills');
  const isPharmacyRoute = pathname.startsWith('/pharmacy');
  const isAdminRoute = pathname.startsWith('/admin');

  const isProtectedRoute = isDoctorRoute || isBillsRoute || isPharmacyRoute || isAdminRoute;

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(sessionCookie, SECRET_KEY);
    const roleStr = (payload.role as string) || '';
    const roles = roleStr.split(',').map((r) => r.trim());
    const isAdmin = roles.includes('Admin');
    const isDoctor = roles.includes('Doctor') || isAdmin;
    const isReceptionist = roles.includes('Receptionist') || isAdmin;
    const isPharmacy = roles.includes('Pharmacy') || isAdmin;

    // Doctor section
    if (isDoctorRoute && !isDoctor) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Bills section
    if (isBillsRoute && !isReceptionist) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Pharmacy section
    if (isPharmacyRoute && !isPharmacy) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Admin section
    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/doctor/:path*', '/bills/:path*', '/pharmacy/:path*', '/admin/:path*'],
};
