import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, hasRole, parseRoles, formatRoles, VALID_ROLES } from '@/lib/auth';

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, 'Admin')) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { id } = await props.params;

  try {
    const body = await request.json();
    const { name, role, roles, active } = body;

    let formattedRole: string | null = null;
    const rawRoles = roles !== undefined ? roles : role;
    if (rawRoles !== undefined && rawRoles !== null) {
      const parsed = parseRoles(rawRoles);
      if (parsed.length === 0) {
        return NextResponse.json(
          { error: `At least one valid role is required: ${VALID_ROLES.join(', ')}` },
          { status: 400 }
        );
      }
      formattedRole = formatRoles(parsed);
    }

    const res = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           active = COALESCE($3, active)
       WHERE user_id = $4
       RETURNING user_id, username, role, name, active, created_at`,
      [name?.trim() || null, formattedRole, active !== undefined ? Boolean(active) : null, parseInt(id, 10)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: res.rows[0] });
  } catch (err: any) {
    console.error('Error updating user:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
