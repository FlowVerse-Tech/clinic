import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
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
    const formData = await request.formData();
    const patient_id = formData.get('patient_id') as string;
    const report_type = formData.get('report_type') as string;
    const file = formData.get('file') as File | null;

    if (!patient_id || !report_type) {
      return NextResponse.json(
        { error: 'Patient ID and report type are required' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Patient check
    const pCheck = await query('SELECT patient_id FROM patients WHERE patient_id = $1', [patient_id]);
    if (pCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const mimeType = file.type || 'application/octet-stream';
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Data}`;
    let fileUrl = dataUri;

    // Attempt local storage if running in writeable environment
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'reports');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(uploadsDir, safeFileName);
      fs.writeFileSync(filePath, buffer);
      fileUrl = `/uploads/reports/${safeFileName}`;
    } catch {
      // In serverless environments with read-only filesystem, use dataUri directly
      fileUrl = dataUri;
    }

    const res = await query(
      `INSERT INTO reports (patient_id, file_url, report_type, uploaded_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [patient_id, fileUrl, report_type.trim()]
    );

    return NextResponse.json({
      success: true,
      report: res.rows[0],
    });
  } catch (err: any) {
    console.error('Error uploading report:', err);
    return NextResponse.json(
      { error: 'Failed to upload report: ' + err.message },
      { status: 500 }
    );
  }
}
