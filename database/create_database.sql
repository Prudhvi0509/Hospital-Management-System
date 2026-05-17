-- Script to create hospital_appointment database
-- For XAMPP MySQL on port 3307

CREATE DATABASE IF NOT EXISTS hospital_appointment
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

-- Use the database
USE hospital_appointment;

-- Confirm database creation
SELECT 'Database hospital_appointment created successfully!' AS Message;