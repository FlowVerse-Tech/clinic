-- DVS Clinic PostgreSQL Database Schema

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'Doctor', 'Receptionist', 'Pharmacy', 'Admin'
  name VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  patient_id VARCHAR(20) PRIMARY KEY, -- YYYYMMDDXXXX
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
  billing_type VARCHAR(50) NOT NULL, -- 'Consultation' or 'Pharmacy'
  amount NUMERIC(10, 2) NOT NULL,
  payment_mode VARCHAR(50) NOT NULL, -- 'Cash', 'Card', 'UPI', etc.
  status VARCHAR(20) NOT NULL DEFAULT 'Paid', -- 'Paid' or 'Pending'
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
  type VARCHAR(20) NOT NULL, -- 'Inward' or 'Outward'
  quantity INT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  supplier VARCHAR(255), -- for Inward
  patient_id VARCHAR(20) REFERENCES patients(patient_id) ON DELETE SET NULL -- for Outward
);

-- Indexes for performance
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
