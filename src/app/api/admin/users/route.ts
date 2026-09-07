import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const res = await query(
      `SELECT user_id, username, role, name, active, created_at
       FROM users
       ORDER BY user_id ASC`
    );

    return NextResponse.json({ users: res.rows });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { username, password, role, name, active } = body;

    if (!username || !password || !role || !name) {
      return NextResponse.json(
        { error: 'Username, password, role, and name are required.' },
        { status: 400 }
      );
    }

    const validRoles = ['Doctor', 'Receptionist', 'Pharmacy', 'Admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Check duplicate username
    const checkUser = await query(
      `SELECT user_id FROM users WHERE LOWER(username) = LOWER($1)`,
      [username.trim()]
    );

    if (checkUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Username already exists. Please choose another username.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isActive = active !== undefined ? Boolean(active) : true;

    const res = await query(
      `INSERT INTO users (username, password, role, name, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, username, role, name, active, created_at`,
      [username.trim(), hashedPassword, role, name.trim(), isActive]
    );

    return NextResponse.json({
      success: true,
      user: res.rows[0],
    });
  } catch (err: any) {
    console.error('Error creating user:', err);
    return NextResponse.json(
      { error: 'Failed to create user: ' + err.message },
      { status: 500 }
    );
  }
}
