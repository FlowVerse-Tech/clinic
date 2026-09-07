import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await query(
      `SELECT medicine_id, name, batch_number, expiry_date, current_stock
       FROM medicines
       ORDER BY expiry_date ASC, name ASC`
    );

    return NextResponse.json({ medicines: res.rows });
  } catch (err: any) {
    console.error('Error fetching medicines:', err);
    return NextResponse.json(
      { error: 'Failed to fetch medicines: ' + err.message },
      { status: 500 }
    );
  }
}
