import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await props.params;

  try {
    const { status } = await request.json();
    if (status !== 'Paid' && status !== 'Pending') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const res = await query(
      `UPDATE bills SET status = $1 WHERE bill_id = $2 RETURNING *`,
      [status, parseInt(id, 10)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, bill: res.rows[0] });
  } catch (err: any) {
    console.error('Error updating bill:', err);
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 });
  }
}
