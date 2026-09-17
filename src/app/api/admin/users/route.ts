import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { getCurrentUser, hasRole, parseRoles, formatRoles, VALID_ROLES } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, 'Admin')) {
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
  if (!user || !hasRole(user.role, 'Admin')) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { username, password, role, roles, name, active } = body;

    const rawRoles = roles || role;
    const assignedRoles = parseRoles(rawRoles);

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Username, password, and name are required.' },
        { status: 400 }
      );
    }

    if (assignedRoles.length === 0) {
      return NextResponse.json(
        { error: `Please assign at least one valid role: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    const formattedRole = formatRoles(assignedRoles);

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
      [username.trim(), hashedPassword, formattedRole, name.trim(), isActive]
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
