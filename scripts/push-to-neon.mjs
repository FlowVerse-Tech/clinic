import fs from 'fs';
import path from 'path';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Client } = pg;

// 1. Read .env.local to get DATABASE_URL
const envPath = path.join(process.cwd(), '.env.local');
let dbUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      const rawVal = trimmed.substring('DATABASE_URL='.length).trim();
      dbUrl = rawVal.replace(/^["']|["']$/g, '');
      break;
    }
  }
}

if (!dbUrl) {
  console.error('❌ Error: DATABASE_URL not found in .env.local or process.env');
  process.exit(1);
}

console.log('Connecting to Neon PostgreSQL database at:');
const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':••••••••@');
console.log(maskedUrl);

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    console.log('✓ Connected to Neon database successfully!');

    // 2. Read schema.sql
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('\nApplying tables and indexes from src/lib/schema.sql...');
    await client.query(schemaSql);
    console.log('✓ Schema executed successfully!');

    // 3. Seed default admin if not existing
    const adminCheck = await client.query("SELECT user_id, username FROM users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      console.log('Seeding default admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO users (username, password, role, name, active)
         VALUES ($1, $2, 'Admin', 'Default Admin', true)`,
        ['admin', hashedPassword]
      );
      console.log('✓ Seeded default admin user (username: admin, password: admin123)');
    } else {
      console.log('✓ Admin user already exists in Neon DB.');
    }

    // 4. Verify tables
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n--- Tables in Neon Database (public schema) ---');
    tablesRes.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.table_name}`);
    });

    console.log('\n✅ All tables and indexes have been pushed to Neon DB successfully!');
  } catch (err) {
    console.error('❌ Failed to push schema to Neon DB:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
