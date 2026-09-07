import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    // 1. All patients
    const patientsRes = await query(
      `SELECT patient_id, name, age, sex, phone_number, email, created_at
       FROM patients
       ORDER BY created_at DESC`
    );

    // 2. All bills
    const billsRes = await query(
      `SELECT b.*, p.name as patient_name, u.name as handled_by_name
       FROM bills b
       LEFT JOIN patients p ON b.patient_id = p.patient_id
       LEFT JOIN users u ON b.handled_by = u.user_id
       ORDER BY b.date DESC`
    );

    // 3. Stock list
    const medicinesRes = await query(
      `SELECT medicine_id, name, batch_number, expiry_date, current_stock
       FROM medicines
       ORDER BY expiry_date ASC, name ASC`
    );

    return NextResponse.json({
      patients: patientsRes.rows,
      bills: billsRes.rows,
      medicines: medicinesRes.rows,
    });
  } catch (err: any) {
    console.error('Error fetching admin summary:', err);
    return NextResponse.json(
      { error: 'Failed to fetch summary data' },
      { status: 500 }
    );
  }
}
