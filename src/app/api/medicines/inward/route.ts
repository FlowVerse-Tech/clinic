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
    const { name, batch_number, expiry_date, quantity, supplier } = body;

    if (!name || !batch_number || !expiry_date || !quantity) {
      return NextResponse.json(
        { error: 'Medicine name, batch number, expiry date, and quantity are required.' },
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

    const trimmedName = name.trim();
    const trimmedBatch = batch_number.trim();

    // Check if matching medicine (same name and batch number) already exists
    const existing = await query(
      `SELECT medicine_id, current_stock FROM medicines
       WHERE LOWER(name) = LOWER($1) AND batch_number = $2`,
      [trimmedName, trimmedBatch]
    );

    let medicineId: number;
    let newStock: number;

    if (existing.rows.length > 0) {
      medicineId = existing.rows[0].medicine_id;
      newStock = existing.rows[0].current_stock + qty;
      await query(
        `UPDATE medicines
         SET current_stock = $1, expiry_date = $2
         WHERE medicine_id = $3`,
        [newStock, expiry_date, medicineId]
      );
    } else {
      const inserted = await query(
        `INSERT INTO medicines (name, batch_number, expiry_date, current_stock)
         VALUES ($1, $2, $3, $4)
         RETURNING medicine_id, current_stock`,
        [trimmedName, trimmedBatch, expiry_date, qty]
      );
      medicineId = inserted.rows[0].medicine_id;
      newStock = inserted.rows[0].current_stock;
    }

    // Record Inward transaction
    await query(
      `INSERT INTO medicine_transactions (medicine_id, type, quantity, date, supplier)
       VALUES ($1, 'Inward', $2, CURRENT_TIMESTAMP, $3)`,
      [medicineId, qty, supplier?.trim() || null]
    );

    return NextResponse.json({
      success: true,
      medicine_id: medicineId,
      current_stock: newStock,
    });
  } catch (err: any) {
    console.error('Error adding inward stock:', err);
    return NextResponse.json(
      { error: 'Failed to record inward stock: ' + err.message },
      { status: 500 }
    );
  }
}
