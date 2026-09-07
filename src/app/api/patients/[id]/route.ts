import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await props.params;

  try {
    // 1. Patient info
    const patientRes = await query(
      `SELECT * FROM patients WHERE patient_id = $1`,
      [id]
    );

    if (patientRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const patient = patientRes.rows[0];

    // 2. Visits
    const visitsRes = await query(
      `SELECT * FROM visits WHERE patient_id = $1 ORDER BY visit_date DESC`,
      [id]
    );

    // 3. Reports
    const reportsRes = await query(
      `SELECT * FROM reports WHERE patient_id = $1 ORDER BY uploaded_at DESC`,
      [id]
    );

    // 4. Bills
    const billsRes = await query(
      `SELECT b.*, u.name AS handled_by_name
       FROM bills b
       LEFT JOIN users u ON b.handled_by = u.user_id
       WHERE b.patient_id = $1
       ORDER BY b.date DESC`,
      [id]
    );

    // 5. Dispensed medicines (Outward transactions linked to patient)
    const dispensedRes = await query(
      `SELECT mt.transaction_id, mt.quantity, mt.date, m.name AS medicine_name, m.batch_number
       FROM medicine_transactions mt
       JOIN medicines m ON mt.medicine_id = m.medicine_id
       WHERE mt.patient_id = $1 AND mt.type = 'Outward'
       ORDER BY mt.date DESC`,
      [id]
    );

    return NextResponse.json({
      patient,
      visits: visitsRes.rows,
      reports: reportsRes.rows,
      bills: billsRes.rows,
      dispensed_medicines: dispensedRes.rows,
    });
  } catch (err: any) {
    console.error('Error fetching patient details:', err);
    return NextResponse.json(
      { error: 'Failed to fetch patient details' },
      { status: 500 }
    );
  }
}
