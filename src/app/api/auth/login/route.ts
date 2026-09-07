import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signSessionToken, SESSION_COOKIE_NAME, getRoleHome } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();

    // Query active user
    const res = await query(
      'SELECT user_id, username, password, role, name, active FROM users WHERE username = $1',
      [trimmedUsername]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const user = res.rows[0];

    if (!user.active) {
      return NextResponse.json(
        { error: 'This account has been deactivated. Contact an administrator.' },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      userId: user.user_id,
      username: user.username,
      role: user.role,
      name: user.name,
    });

    const redirectUrl = getRoleHome(user.role);

    const response = NextResponse.json({
      success: true,
      user: {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
      redirectUrl,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
