import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patient_id');
  const dateFilter = searchParams.get('date'); // YYYY-MM-DD format

  try {
    if (patientId) {
      const res = await query(
        `SELECT b.*, u.name as handled_by_name, p.name as patient_name
         FROM bills b
         LEFT JOIN users u ON b.handled_by = u.user_id
         LEFT JOIN patients p ON b.patient_id = p.patient_id
         WHERE b.patient_id = $1
         ORDER BY b.date DESC`,
        [patientId]
      );
      return NextResponse.json({ bills: res.rows });
    }

    if (dateFilter) {
      // Fetch bills for specific date
      const res = await query(
        `SELECT b.*, u.name as handled_by_name, p.name as patient_name, p.phone_number
         FROM bills b
         LEFT JOIN users u ON b.handled_by = u.user_id
         LEFT JOIN patients p ON b.patient_id = p.patient_id
         WHERE b.date::date = $1::date
         ORDER BY b.date DESC`,
        [dateFilter]
      );

      // Compute daily summary
      let totalAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      let consultationAmount = 0;
      let pharmacyAmount = 0;

      for (const bill of res.rows) {
        const amt = parseFloat(bill.amount) || 0;
        totalAmount += amt;
        if (bill.status === 'Paid') {
          paidAmount += amt;
        } else {
          pendingAmount += amt;
        }

        if (bill.billing_type === 'Consultation') {
          consultationAmount += amt;
        } else if (bill.billing_type === 'Pharmacy') {
          pharmacyAmount += amt;
        }
      }

      return NextResponse.json({
        date: dateFilter,
        summary: {
          totalAmount,
          paidAmount,
          pendingAmount,
          consultationAmount,
          pharmacyAmount,
          count: res.rows.length,
        },
        bills: res.rows,
      });
    }

    // Default: recent 50 bills
    const res = await query(
      `SELECT b.*, u.name as handled_by_name, p.name as patient_name
       FROM bills b
       LEFT JOIN users u ON b.handled_by = u.user_id
       LEFT JOIN patients p ON b.patient_id = p.patient_id
       ORDER BY b.date DESC
       LIMIT 50`
    );

    return NextResponse.json({ bills: res.rows });
  } catch (err: any) {
    console.error('Error fetching bills:', err);
    return NextResponse.json(
      { error: 'Failed to fetch bills: ' + err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Doctor, Receptionist, Admin can create bills
  try {
    const body = await request.json();
    const { patient_id, billing_type, amount, payment_mode, status } = body;

    if (!patient_id || !billing_type || amount === undefined || !payment_mode) {
      return NextResponse.json(
        { error: 'Patient ID, billing type, amount, and payment mode are required.' },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return NextResponse.json(
        { error: 'Please enter a valid bill amount.' },
        { status: 400 }
      );
    }

    // Patient check
    const pCheck = await query('SELECT patient_id FROM patients WHERE patient_id = $1', [patient_id]);
    if (pCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const billStatus = status === 'Pending' ? 'Pending' : 'Paid';

    const res = await query(
      `INSERT INTO bills (
        patient_id, billing_type, amount, payment_mode, status, handled_by, date
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        patient_id,
        billing_type,
        numAmount,
        payment_mode,
        billStatus,
        user.userId,
      ]
    );

    return NextResponse.json({
      success: true,
      bill: res.rows[0],
    });
  } catch (err: any) {
    console.error('Error creating bill:', err);
    return NextResponse.json(
      { error: 'Failed to create bill: ' + err.message },
      { status: 500 }
    );
  }
}
