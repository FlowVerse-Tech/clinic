import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'Pharmacy' && user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { medicine_id, quantity, patient_id } = body;

    if (!medicine_id || !quantity) {
      return NextResponse.json(
        { error: 'Medicine and quantity are required.' },
        { status: 400 }
      );
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number.' },
        { status: 400 }
      );
    }

    // Check medicine stock
    const medRes = await query(
      `SELECT medicine_id, name, current_stock FROM medicines WHERE medicine_id = $1`,
      [parseInt(medicine_id, 10)]
    );

    if (medRes.rows.length === 0) {
      return NextResponse.json({ error: 'Medicine not found.' }, { status: 404 });
    }

    const medicine = medRes.rows[0];
    if (medicine.current_stock < qty) {
      return NextResponse.json(
        { error: `Insufficient stock for ${medicine.name}. Available: ${medicine.current_stock}` },
        { status: 400 }
      );
    }

    // Optional patient validation
    let validPatientId: string | null = null;
    if (patient_id && patient_id.trim() !== '') {
      const pCheck = await query(
        `SELECT patient_id FROM patients WHERE patient_id = $1`,
        [patient_id.trim()]
      );
      if (pCheck.rows.length === 0) {
        return NextResponse.json(
          { error: `Patient ID ${patient_id} does not exist.` },
          { status: 400 }
        );
      }
      validPatientId = patient_id.trim();
    }

    const updatedStock = medicine.current_stock - qty;

    // Deduct stock
    await query(
      `UPDATE medicines SET current_stock = $1 WHERE medicine_id = $2`,
      [updatedStock, medicine.medicine_id]
    );

    // Record Outward transaction
    const txRes = await query(
      `INSERT INTO medicine_transactions (medicine_id, type, quantity, date, patient_id)
       VALUES ($1, 'Outward', $2, CURRENT_TIMESTAMP, $3)
       RETURNING *`,
      [medicine.medicine_id, qty, validPatientId]
    );

    return NextResponse.json({
      success: true,
      transaction: txRes.rows[0],
      current_stock: updatedStock,
    });
  } catch (err: any) {
    console.error('Error dispensing medicine:', err);
    return NextResponse.json(
      { error: 'Failed to dispense medicine: ' + err.message },
      { status: 500 }
    );
  }
}
