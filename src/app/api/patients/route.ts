import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Helper to generate sequential patient ID: YYYYMMDDXXXX
async function generatePatientId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  const res = await query(
    `SELECT patient_id FROM patients
     WHERE patient_id LIKE $1
     ORDER BY patient_id DESC LIMIT 1`,
    [`${datePrefix}%`]
  );

  let nextSeq = 1;
  if (res.rows.length > 0) {
    const lastId = res.rows[0].patient_id;
    const seqStr = lastId.substring(8);
    const parsed = parseInt(seqStr, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  const seqFormatted = nextSeq.toString().padStart(4, '0');
  return `${datePrefix}${seqFormatted}`;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';

  try {
    let sql: string;
    let params: any[] = [];

    if (q) {
      sql = `
        SELECT patient_id, name, age, sex, phone_number, email, created_at
        FROM patients
        WHERE patient_id ILIKE $1 OR name ILIKE $1 OR phone_number ILIKE $1
        ORDER BY created_at DESC
        LIMIT 25
      `;
      params = [`%${q}%`];
    } else {
      sql = `
        SELECT patient_id, name, age, sex, phone_number, email, created_at
        FROM patients
        ORDER BY created_at DESC
        LIMIT 25
      `;
    }

    const res = await query(sql, params);
    return NextResponse.json({ patients: res.rows });
  } catch (err: any) {
    console.error('Error fetching patients:', err);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      age,
      sex,
      phone_number,
      email,
      description,
      family_history,
      past_medical_history,
    } = body;

    // Validation
    if (!name || !age || !sex || !phone_number) {
      return NextResponse.json(
        { error: 'Name, age, sex, and phone number are required.' },
        { status: 400 }
      );
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      return NextResponse.json(
        { error: 'Please enter a valid age.' },
        { status: 400 }
      );
    }

    const patientId = await generatePatientId();

    const insertRes = await query(
      `INSERT INTO patients (
        patient_id, name, age, sex, phone_number, email,
        description, family_history, past_medical_history
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        patientId,
        name.trim(),
        parsedAge,
        sex,
        phone_number.trim(),
        email?.trim() || null,
        description?.trim() || null,
        family_history?.trim() || null,
        past_medical_history?.trim() || null,
      ]
    );

    return NextResponse.json({
      success: true,
      patient: insertRes.rows[0],
    });
  } catch (err: any) {
    console.error('Error registering patient:', err);
    return NextResponse.json(
      { error: 'Failed to register patient: ' + err.message },
      { status: 500 }
    );
  }
}
