-- hospital_appointment_pg.sql
-- PostgreSQL Database Schema for Hospital Appointment System
-- Migrated from MySQL - Compatible with PostgreSQL 14+

-- ===========================
-- Extensions
-- ===========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================
-- Custom Types (ENUM equivalents)
-- ===========================
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'checked_in', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===========================
-- Tables
-- ===========================

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Doctors
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes SMALLINT NOT NULL DEFAULT 30,
    status appointment_status DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent exact same-start-time double-booking for same doctor
    CONSTRAINT uq_doctor_datetime UNIQUE (doctor_id, appointment_date, appointment_time)
);

-- ===========================
-- Indexes
-- ===========================
CREATE INDEX IF NOT EXISTS idx_appt_date_time ON appointments (appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appt_doctor_date ON appointments (doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status, appointment_date);
CREATE INDEX IF NOT EXISTS idx_doctors_department ON doctors (department_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients (phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (full_name);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments (name);

-- Covering index for appointment details
CREATE INDEX IF NOT EXISTS idx_appointments_covering 
ON appointments (doctor_id, appointment_date, appointment_time, status, patient_id, duration_minutes);

-- ===========================
-- Updated_at Trigger Function
-- ===========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to appointments table
DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================
-- Views
-- ===========================

-- View for appointment details with all joins
CREATE OR REPLACE VIEW vw_appointment_details AS
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.duration_minutes,
    a.status,
    a.notes,
    a.created_at,
    p.id as patient_id,
    p.full_name as patient_name,
    p.phone as patient_phone,
    p.email as patient_email,
    d.id as doctor_id,
    d.full_name as doctor_name,
    d.phone as doctor_phone,
    d.email as doctor_email,
    dept.id as department_id,
    dept.name as department_name
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN doctors d ON a.doctor_id = d.id
LEFT JOIN departments dept ON d.department_id = dept.id;

-- View for doctor schedules (optimized for conflict checking)
CREATE OR REPLACE VIEW vw_doctor_schedule AS
SELECT 
    a.doctor_id,
    a.appointment_date,
    a.appointment_time,
    a.duration_minutes,
    a.status,
    a.appointment_time as start_time,
    (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL)::TIME as end_time,
    d.full_name as doctor_name,
    p.full_name as patient_name
FROM appointments a
LEFT JOIN doctors d ON a.doctor_id = d.id
LEFT JOIN patients p ON a.patient_id = p.id
WHERE a.status != 'cancelled';

-- View for dashboard statistics
CREATE OR REPLACE VIEW vw_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM appointments) as total_appointments,
    (SELECT COUNT(*) FROM patients) as total_patients,
    (SELECT COUNT(*) FROM doctors) as total_doctors,
    (SELECT COUNT(*) FROM departments) as total_departments,
    (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE) as today_appointments,
    (SELECT COUNT(*) FROM appointments WHERE status = 'scheduled') as scheduled_appointments,
    (SELECT COUNT(*) FROM appointments WHERE status = 'completed') as completed_appointments,
    (SELECT COUNT(*) FROM appointments WHERE status = 'cancelled') as cancelled_appointments;

-- Most busy hours view
CREATE OR REPLACE VIEW vw_busy_hours AS
SELECT 
    EXTRACT(HOUR FROM appointment_time)::INTEGER as hour,
    COUNT(*) as appointment_count,
    COUNT(DISTINCT doctor_id) as doctors_involved
FROM appointments 
WHERE status != 'cancelled'
GROUP BY EXTRACT(HOUR FROM appointment_time)
ORDER BY appointment_count DESC;

-- Most busy days view
CREATE OR REPLACE VIEW vw_busy_days AS
SELECT 
    TO_CHAR(appointment_date, 'Day') as day_name,
    EXTRACT(DOW FROM appointment_date)::INTEGER as day_number,
    COUNT(*) as appointment_count
FROM appointments 
WHERE status != 'cancelled'
GROUP BY EXTRACT(DOW FROM appointment_date), TO_CHAR(appointment_date, 'Day')
ORDER BY appointment_count DESC;

-- Doctor utilization view
CREATE OR REPLACE VIEW vw_doctor_utilization AS
SELECT 
    d.id,
    d.full_name,
    dept.name as department,
    COUNT(a.id) as total_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
    COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
    CASE 
        WHEN COUNT(a.id) > 0 THEN 
            ROUND(COUNT(CASE WHEN a.status = 'completed' THEN 1 END) * 100.0 / COUNT(a.id), 2)
        ELSE 0 
    END as completion_rate
FROM doctors d
LEFT JOIN appointments a ON d.id = a.doctor_id
LEFT JOIN departments dept ON d.department_id = dept.id
GROUP BY d.id, d.full_name, dept.name
ORDER BY total_appointments DESC;

-- ===========================
-- Functions
-- ===========================

-- Function to check appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflict(
    p_doctor_id INTEGER,
    p_appointment_date DATE,
    p_appointment_time TIME,
    p_duration_minutes INTEGER,
    p_exclude_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
    p_end_time TIME;
BEGIN
    p_end_time := p_appointment_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    SELECT COUNT(*) INTO conflict_count
    FROM appointments
    WHERE doctor_id = p_doctor_id 
        AND appointment_date = p_appointment_date
        AND status != 'cancelled'
        AND (p_exclude_id IS NULL OR id != p_exclude_id)
        AND (
            (appointment_time <= p_appointment_time 
             AND (appointment_time + (duration_minutes || ' minutes')::INTERVAL) > p_appointment_time) 
            OR
            (appointment_time < p_end_time 
             AND (appointment_time + (duration_minutes || ' minutes')::INTERVAL) >= p_end_time)
        );
    
    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Stored procedure to check doctor overlap
CREATE OR REPLACE FUNCTION check_doctor_overlap(
    p_doctor_id INTEGER,
    p_date DATE,
    p_start TIME,
    p_duration INTEGER,
    p_exclude_appt_id INTEGER DEFAULT NULL
) RETURNS TABLE(overlap INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END::INTEGER
    FROM appointments
    WHERE doctor_id = p_doctor_id
        AND appointment_date = p_date
        AND (p_exclude_appt_id IS NULL OR id != p_exclude_appt_id)
        AND (
            (appointment_time + (duration_minutes || ' minutes')::INTERVAL) > p_start
            AND (p_start + (p_duration || ' minutes')::INTERVAL) > appointment_time
        );
END;
$$ LANGUAGE plpgsql;

-- Procedure to clean up old cancelled appointments
CREATE OR REPLACE FUNCTION sp_cleanup_old_appointments()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM appointments 
    WHERE status = 'cancelled' 
        AND appointment_date < (CURRENT_DATE - INTERVAL '6 months');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================
-- Trigger Functions for Validation
-- ===========================

-- Prevent creating appointment in the past
CREATE OR REPLACE FUNCTION trg_appt_no_past_check()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.appointment_date + NEW.appointment_time) < NOW() THEN
        RAISE EXCEPTION 'Cannot create appointment in the past';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevent overlapping appointments
CREATE OR REPLACE FUNCTION trg_appt_no_overlap_check()
RETURNS TRIGGER AS $$
DECLARE
    overlap_count INTEGER;
    new_end_time TIME;
BEGIN
    new_end_time := NEW.appointment_time + (NEW.duration_minutes || ' minutes')::INTERVAL;
    
    SELECT COUNT(*) INTO overlap_count
    FROM appointments
    WHERE doctor_id = NEW.doctor_id
        AND appointment_date = NEW.appointment_date
        AND (TG_OP = 'INSERT' OR id != NEW.id)
        AND status != 'cancelled'
        AND (
            (appointment_time + (duration_minutes || ' minutes')::INTERVAL) > NEW.appointment_time
            AND new_end_time > appointment_time
        );
    
    IF overlap_count > 0 THEN
        RAISE EXCEPTION 'Overlapping appointment exists for this doctor';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation triggers
DROP TRIGGER IF EXISTS trg_appt_no_past_insert ON appointments;
CREATE TRIGGER trg_appt_no_past_insert
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trg_appt_no_past_check();

DROP TRIGGER IF EXISTS trg_appt_no_past_update ON appointments;
CREATE TRIGGER trg_appt_no_past_update
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trg_appt_no_past_check();

DROP TRIGGER IF EXISTS trg_appt_no_overlap_insert ON appointments;
CREATE TRIGGER trg_appt_no_overlap_insert
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trg_appt_no_overlap_check();

DROP TRIGGER IF EXISTS trg_appt_no_overlap_update ON appointments;
CREATE TRIGGER trg_appt_no_overlap_update
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trg_appt_no_overlap_check();

-- ===========================
-- Seed / Sample Data
-- ===========================

INSERT INTO departments (name) VALUES
    ('Cardiology'),
    ('Neurology'),
    ('Orthopedics'),
    ('Pediatrics')
ON CONFLICT (name) DO NOTHING;

INSERT INTO patients (full_name, phone, email) VALUES
    ('John Doe', '+1-555-0123', 'john@example.com'),
    ('Jane Smith', '+1-555-0124', 'jane@example.com'),
    ('Mike Johnson', '+1-555-0125', 'mike@example.com')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO doctors (full_name, department_id, phone, email) VALUES
    ('Dr. Alice Heart', 1, '+1-555-1000', 'alice.heart@example.com'),
    ('Dr. Bob Brain', 2, '+1-555-1001', 'bob.brain@example.com'),
    ('Dr. Chris Bone', 3, '+1-555-1002', 'chris.bone@example.com'),
    ('Dr. Daisy Kids', 4, '+1-555-1003', 'daisy.kids@example.com')
ON CONFLICT DO NOTHING;

-- Example appointments (using future dates)
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration_minutes, status, notes)
SELECT 
    1, 1, CURRENT_DATE + INTERVAL '1 day', '09:00:00', 30, 'scheduled', 'Initial consultation'
WHERE NOT EXISTS (
    SELECT 1 FROM appointments WHERE doctor_id = 1 AND appointment_date = CURRENT_DATE + INTERVAL '1 day' AND appointment_time = '09:00:00'
);

INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration_minutes, status, notes)
SELECT 
    2, 2, CURRENT_DATE + INTERVAL '1 day', '10:30:00', 30, 'scheduled', 'Neurology check-up'
WHERE NOT EXISTS (
    SELECT 1 FROM appointments WHERE doctor_id = 2 AND appointment_date = CURRENT_DATE + INTERVAL '1 day' AND appointment_time = '10:30:00'
);

INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration_minutes, status, notes)
SELECT 
    3, 3, CURRENT_DATE + INTERVAL '2 days', '11:00:00', 45, 'scheduled', 'Orthopedics follow-up'
WHERE NOT EXISTS (
    SELECT 1 FROM appointments WHERE doctor_id = 3 AND appointment_date = CURRENT_DATE + INTERVAL '2 days' AND appointment_time = '11:00:00'
);

-- ===========================
-- End of PostgreSQL Schema
-- ===========================
