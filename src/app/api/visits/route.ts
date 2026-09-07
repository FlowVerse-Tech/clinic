import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'Doctor' && user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      patient_id,
      on_examination,
      current_symptoms,
      diagnosis,
      current_prescription,
      visit_date,
    } = body;

    if (!patient_id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const pCheck = await query('SELECT patient_id FROM patients WHERE patient_id = $1', [patient_id]);
    if (pCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Patient does not exist' },
        { status: 404 }
      );
    }

    const res = await query(
      `INSERT INTO visits (
        patient_id, on_examination, current_symptoms, diagnosis, current_prescription, visit_date
      ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_TIMESTAMP))
      RETURNING *`,
      [
        patient_id,
        on_examination?.trim() || '',
        current_symptoms?.trim() || '',
        diagnosis?.trim() || '',
        current_prescription?.trim() || '',
        visit_date ? new Date(visit_date) : null,
      ]
    );

    return NextResponse.json({
      success: true,
      visit: res.rows[0],
    });
  } catch (err: any) {
    console.error('Error recording visit:', err);
    return NextResponse.json(
      { error: 'Failed to record visit: ' + err.message },
      { status: 500 }
    );
  }
}
