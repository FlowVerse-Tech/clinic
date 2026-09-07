import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { id } = await props.params;

  try {
    const { password } = await request.json();

    if (!password || password.trim().length < 4) {
      return NextResponse.json(
        { error: 'New password must be at least 4 characters long.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const res = await query(
      `UPDATE users SET password = $1 WHERE user_id = $2 RETURNING user_id, username`,
      [hashedPassword, parseInt(id, 10)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for user ${res.rows[0].username}`,
    });
  } catch (err: any) {
    console.error('Error resetting password:', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
