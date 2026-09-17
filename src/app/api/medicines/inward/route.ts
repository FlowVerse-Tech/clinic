import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasRole(user.role, 'Pharmacy')) {
    return NextResponse.json({ error: 'Forbidden: Pharmacy access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, batch_number, expiry_date, quantity, supplier, rate } = body;

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

    const unitRate = rate !== undefined && rate !== null && rate !== '' ? parseFloat(rate) : 0.0;
    if (isNaN(unitRate) || unitRate < 0) {
      return NextResponse.json(
        { error: 'Rate must be a non-negative number.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const trimmedBatch = batch_number.trim();

    // Check if matching medicine (same name and batch number) already exists
    const existing = await query(
      `SELECT medicine_id, current_stock, rate FROM medicines
       WHERE LOWER(name) = LOWER($1) AND batch_number = $2`,
      [trimmedName, trimmedBatch]
    );

    let medicineId: number;
    let newStock: number;

    if (existing.rows.length > 0) {
      medicineId = existing.rows[0].medicine_id;
      newStock = existing.rows[0].current_stock + qty;
      const updatedRate = unitRate > 0 ? unitRate : (parseFloat(existing.rows[0].rate) || 0.0);
      await query(
        `UPDATE medicines
         SET current_stock = $1, expiry_date = $2, rate = $3
         WHERE medicine_id = $4`,
        [newStock, expiry_date, updatedRate, medicineId]
      );
    } else {
      const inserted = await query(
        `INSERT INTO medicines (name, batch_number, expiry_date, current_stock, rate)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING medicine_id, current_stock`,
        [trimmedName, trimmedBatch, expiry_date, qty, unitRate]
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
