import bcrypt from 'bcryptjs';

// Define unified query interface
export interface QueryResult<T = any> {
  rows: T[];
}

let dbPool: any = null;
let pgliteInstance: any = null;
let isInitialized = false;

// Embedded DDL schema so Vercel Serverless Functions do not rely on local file tracing
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  patient_id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  age INT NOT NULL,
  sex VARCHAR(20) NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  email VARCHAR(255),
  description TEXT,
  family_history TEXT,
  past_medical_history TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visits (
  visit_id SERIAL PRIMARY KEY,
  patient_id VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  visit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  on_examination TEXT,
  current_symptoms TEXT,
  diagnosis TEXT,
  current_prescription TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  report_id SERIAL PRIMARY KEY,
  patient_id VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
  bill_id SERIAL PRIMARY KEY,
  patient_id VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  billing_type VARCHAR(50) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_mode VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Paid',
  handled_by INT REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS medicines (
  medicine_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  expiry_date DATE NOT NULL,
  current_stock INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS medicine_transactions (
  transaction_id SERIAL PRIMARY KEY,
  medicine_id INT NOT NULL REFERENCES medicines(medicine_id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  quantity INT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  supplier VARCHAR(255),
  patient_id VARCHAR(20) REFERENCES patients(patient_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone_number);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_patient ON reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_expiry ON medicines(expiry_date);
CREATE INDEX IF NOT EXISTS idx_transactions_medicine ON medicine_transactions(medicine_id);
CREATE INDEX IF NOT EXISTS idx_transactions_patient ON medicine_transactions(patient_id);
`;

async function getDbDriver() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (connectionString) {
    if (!dbPool) {
      if (connectionString.includes('neon.tech')) {
        // Neon-optimized serverless WebSocket/HTTP connection pool
        const { Pool } = await import('@neondatabase/serverless');
        dbPool = new Pool({ connectionString });
      } else {
        const { Pool } = await import('pg');
        const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
        dbPool = new Pool({
          connectionString,
          ssl: isLocalhost ? false : { rejectUnauthorized: false },
        });
      }
    }

    return {
      type: 'neon' as const,
      query: async <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
        const client = await dbPool.connect();
        try {
          const res = await client.query(text, params);
          return { rows: res.rows };
        } finally {
          client.release();
        }
      },
    };
  }

  // If no DATABASE_URL is provided in Vercel production:
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_URL environment variable is missing on Vercel. Please add DATABASE_URL in Vercel Project Settings -> Environment Variables.'
    );
  }

  // Zero-config embedded PostgreSQL via PGlite for local offline development
  if (!pgliteInstance) {
    const { PGlite } = await import('@electric-sql/pglite');
    const fs = await import('fs');
    const path = await import('path');
    const dataDir = path.join(process.cwd(), 'data', 'clinic_pglite');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    pgliteInstance = new PGlite(dataDir);
  }

  return {
    type: 'pglite' as const,
    query: async <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
      const res = await pgliteInstance.query(text, params);
      return { rows: res.rows };
    },
  };
}

export async function query<T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
  if (!isInitialized) {
    await initDb();
  }
  const driver = await getDbDriver();
  return driver.query<T>(text, params);
}

export async function initDb() {
  if (isInitialized) return;
  const driver = await getDbDriver();

  // 1. Create tables using embedded SQL
  const statements = SCHEMA_SQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await driver.query(statement + ';');
    } catch (err: any) {
      // Table or index may already exist
      console.warn('DB init notice:', err.message);
    }
  }

  // 2. Seed default admin if not existing
  try {
    const checkAdmin = await driver.query('SELECT user_id FROM users WHERE username = $1', ['admin']);
    if (checkAdmin.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await driver.query(
        `INSERT INTO users (username, password, role, name, active)
         VALUES ($1, $2, 'Admin', 'Default Admin', true)`,
        ['admin', hashedPassword]
      );
      console.log('Seeded default admin user (admin / admin123)');
    }
  } catch (err: any) {
    console.error('Error checking/seeding admin user:', err);
  }

  isInitialized = true;
}
