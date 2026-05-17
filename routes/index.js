// Consolidated Routes - All API routes in one file
const express = require('express');
const router = express.Router();
const { Department, Patient, Doctor, Appointment } = require('../models');

// Auth Routes
router.use('/auth', require('./authRoutes'));

// ===== DEPARTMENT ROUTES =====

// Enhanced error handling middleware - PostgreSQL Version
function handleDatabaseError(err, res, operation = 'operation') {
  console.error(`Database error during ${operation}:`, err);

  // Handle specific PostgreSQL error codes (SQLSTATE codes)
  const pgCode = err.code;
  switch (pgCode) {
    case '23505': // unique_violation
      const field = err.detail?.includes('phone') ? 'phone number' : 'name';
      return res.status(409).json({
        message: `A record with this ${field} already exists`,
        error: 'DUPLICATE_ENTRY',
        field: field,
      });

    case '23503': // foreign_key_violation
      return res.status(409).json({
        message: 'Cannot delete this record as it is being used by other records',
        error: 'FOREIGN_KEY_CONSTRAINT',
        details: 'Please remove all related records first',
      });

    case '22001': // string_data_right_truncation
      return res.status(400).json({
        message: 'Data too long for one or more fields',
        error: 'DATA_TOO_LONG',
        details: 'Please check field length requirements',
      });

    case '23502': // not_null_violation
      return res.status(400).json({
        message: 'Required field cannot be empty',
        error: 'REQUIRED_FIELD_MISSING',
        details: 'Please fill in all required fields',
      });

    case '28000': // invalid_authorization_specification
    case '28P01': // invalid_password
      return res.status(503).json({
        message: 'Database access denied',
        error: 'DATABASE_ACCESS_DENIED',
        details: 'Please contact system administrator',
      });

    case '3D000': // invalid_catalog_name
      return res.status(503).json({
        message: 'Database not available',
        error: 'DATABASE_UNAVAILABLE',
        details: 'Please try again later',
      });

    case 'ECONNREFUSED':
      return res.status(503).json({
        message: 'Database connection failed',
        error: 'DATABASE_CONNECTION_FAILED',
        details: 'Database server is not responding',
      });

    case 'ETIMEDOUT':
      return res.status(503).json({
        message: 'Database operation timed out',
        error: 'DATABASE_TIMEOUT',
        details: 'The operation took too long to complete',
      });

    default:
      return res.status(500).json({
        message: `Database error during ${operation}`,
        error: 'DATABASE_ERROR',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      });
  }
}

// Input validation helper with sanitization
function validateInput(data, rules) {
  const errors = [];
  const sanitizedData = {};

  for (const [field, rule] of Object.entries(rules)) {
    let value = data[field];

    // Apply sanitization first
    if (rule.sanitize) {
      if (typeof value === 'string') {
        // Basic sanitization
        value = value.trim();
        if (rule.sanitize === 'html') {
          // Remove HTML tags
          value = value.replace(/<[^>]*>/g, '');
        }
        if (rule.sanitize === 'sql') {
          // Basic SQL injection prevention
          value = value.replace(/[\x00\x08\x09\x1a\n\r"'\\%]/g, '');
        }
      }
    }

    sanitizedData[field] = value;

    // Required field check
    if (rule.required && (!value || value.toString().trim() === '')) {
      errors.push(`${rule.label || field} is required`);
      continue;
    }

    // Skip other validations if field is empty and not required
    if (!value && value !== 0) continue;

    const stringValue = value.toString().trim();

    // Length validation
    if (rule.minLength && stringValue.length < rule.minLength) {
      errors.push(`${rule.label || field} must be at least ${rule.minLength} characters`);
    }

    if (rule.maxLength && stringValue.length > rule.maxLength) {
      errors.push(`${rule.label || field} cannot exceed ${rule.maxLength} characters`);
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(stringValue)) {
      errors.push(rule.customMessage || `${rule.label || field} format is invalid`);
    }

    // Custom validation
    if (rule.custom && !rule.custom(value)) {
      errors.push(rule.customMessage || `${rule.label || field} is invalid`);
    }

    // Type validation
    if (rule.type) {
      switch (rule.type) {
        case 'integer':
          if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
            errors.push(`${rule.label || field} must be a positive integer`);
          }
          break;
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
            errors.push(`${rule.label || field} must be a valid email address`);
          }
          break;
        case 'date':
          if (!/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
            errors.push(`${rule.label || field} must be in YYYY-MM-DD format`);
          }
          break;
        case 'time':
          if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(stringValue)) {
            errors.push(`${rule.label || field} must be in HH:MM format`);
          }
          break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    sanitizedData: sanitizedData,
  };
}

// Get all departments with enhanced error handling
router.get('/departments', async (req, res) => {
  try {
    const departmentModel = new Department(req.app.locals.db);
    const departments = await departmentModel.findAll();

    if (!Array.isArray(departments)) {
      throw new Error('Invalid data format from database');
    }

    res.json(departments);
  } catch (err) {
    handleDatabaseError(err, res, 'loading departments');
  }
});

// Get department by ID
router.get('/departments/:id', async (req, res) => {
  try {
    const departmentModel = new Department(req.app.locals.db);
    const department = await departmentModel.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json(department);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new department with enhanced validation
router.post('/departments', async (req, res) => {
  try {
    const { name } = req.body;

    // Enhanced input validation with sanitization
    const validation = validateInput(
      { name },
      {
        name: {
          required: true,
          minLength: 2,
          maxLength: 100,
          pattern: /^[a-zA-Z\s\-&'".]+$/,
          customMessage:
            'Department name can only contain letters, spaces, hyphens, apostrophes, quotes, and periods',
          label: 'Department name',
          sanitize: 'html',
        },
      }
    );

    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.errors,
        error: 'VALIDATION_ERROR',
      });
    }

    const departmentModel = new Department(req.app.locals.db);

    // Check for existing department with same name (case-insensitive)
    const existingDepartments = await departmentModel.findAll();
    const nameExists = existingDepartments.some(
      (dept) => dept.name.toLowerCase() === validation.sanitizedData.name.toLowerCase()
    );

    if (nameExists) {
      return res.status(409).json({
        message: 'A department with this name already exists',
        error: 'DUPLICATE_NAME',
        field: 'name',
      });
    }

    const departmentId = await departmentModel.create({ name: validation.sanitizedData.name });

    res.status(201).json({
      message: 'Department created successfully',
      department: { id: departmentId, name: validation.sanitizedData.name },
      success: true,
    });
  } catch (err) {
    handleDatabaseError(err, res, 'creating department');
  }
});

// Update department
router.put('/departments/:id', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const departmentModel = new Department(req.app.locals.db);
    const updated = await departmentModel.updateById(req.params.id, { name });

    if (!updated) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({ message: 'Department updated successfully' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Department name already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Delete department
router.delete('/departments/:id', async (req, res) => {
  try {
    const departmentModel = new Department(req.app.locals.db);
    const deleted = await departmentModel.deleteById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).json({ message: 'Cannot delete department that has doctors assigned to it' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// ===== PATIENT ROUTES =====

// Get all patients
router.get('/patients', async (req, res) => {
  try {
    const { search } = req.query;
    const patientModel = new Patient(req.app.locals.db);

    let patients;
    if (search) {
      patients = await patientModel.searchByName(search);
    } else {
      patients = await patientModel.findAll();
    }

    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get patient by ID
router.get('/patients/:id', async (req, res) => {
  try {
    const patientModel = new Patient(req.app.locals.db);
    const patient = await patientModel.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if phone number exists
router.get('/patients/check/phone/:phone', async (req, res) => {
  try {
    const patientModel = new Patient(req.app.locals.db);
    const patient = await patientModel.findByPhone(req.params.phone);

    res.json({
      exists: !!patient,
      patient: patient || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new patient with enhanced validation
router.post('/patients', async (req, res) => {
  try {
    const { full_name, phone, email } = req.body;

    // Enhanced input validation with sanitization
    const validation = validateInput(
      { full_name, phone, email },
      {
        full_name: {
          required: true,
          minLength: 2,
          maxLength: 100,
          pattern: /^[a-zA-Z\s\-'".]+$/,
          customMessage:
            'Name can only contain letters, spaces, hyphens, apostrophes, quotes, and periods',
          label: 'Full name',
          sanitize: 'html',
        },
        phone: {
          required: true,
          minLength: 10,
          maxLength: 15,
          pattern: /^[\d\s\-\(\)\+]+$/,
          customMessage:
            'Phone number can only contain digits, spaces, hyphens, parentheses, and plus sign',
          label: 'Phone number',
          sanitize: 'html',
        },
        email: {
          required: false,
          maxLength: 100,
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          customMessage: 'Email format is invalid',
          label: 'Email',
          sanitize: 'html',
          type: 'email',
        },
      }
    );

    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.errors,
        error: 'VALIDATION_ERROR',
      });
    }

    const patientModel = new Patient(req.app.locals.db);

    // Check if patient with this phone already exists
    const existingPatient = await patientModel.findByPhone(validation.sanitizedData.phone);
    if (existingPatient) {
      return res.status(409).json({
        message: 'A patient with this phone number already exists',
        error: 'DUPLICATE_PHONE',
        field: 'phone',
        existingPatient: {
          id: existingPatient.id,
          name: existingPatient.full_name,
        },
      });
    }

    const patientData = {
      full_name: validation.sanitizedData.full_name,
      phone: validation.sanitizedData.phone,
      email: validation.sanitizedData.email || null,
    };

    const patientId = await patientModel.create(patientData);

    res.status(201).json({
      message: 'Patient registered successfully',
      patient: { id: patientId, ...patientData },
      success: true,
    });
  } catch (err) {
    handleDatabaseError(err, res, 'registering patient');
  }
});

// Update patient
router.put('/patients/:id', async (req, res) => {
  try {
    const { full_name, phone, email } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ message: 'Full name and phone are required' });
    }

    const patientModel = new Patient(req.app.locals.db);

    // Check if another patient with this phone exists
    const existingPatient = await patientModel.findByPhone(phone);
    if (existingPatient && existingPatient.id != req.params.id) {
      return res
        .status(400)
        .json({ message: 'Another patient with this phone number already exists' });
    }

    const updated = await patientModel.updateById(req.params.id, { full_name, phone, email });

    if (!updated) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({ message: 'Patient updated successfully' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Phone number already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Delete patient
router.delete('/patients/:id', async (req, res) => {
  try {
    const patientModel = new Patient(req.app.locals.db);
    const deleted = await patientModel.deleteById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).json({ message: 'Cannot delete patient who has appointments' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// ===== DOCTOR ROUTES =====

// Get all doctors
router.get('/doctors', async (req, res) => {
  try {
    const { department_id } = req.query;
    const doctorModel = new Doctor(req.app.locals.db);

    let doctors;
    if (department_id) {
      doctors = await doctorModel.findByDepartment(department_id);
    } else {
      doctors = await doctorModel.findAll();
    }

    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get doctor by ID
router.get('/doctors/:id', async (req, res) => {
  try {
    const doctorModel = new Doctor(req.app.locals.db);
    const doctor = await doctorModel.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get doctor's available slots for a specific date
router.get('/doctors/:id/available-slots/:date', async (req, res) => {
  try {
    const { id, date } = req.params;
    const doctorModel = new Doctor(req.app.locals.db);

    // Check if doctor exists
    const doctor = await doctorModel.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Get existing appointments for the date
    const existingAppointments = await doctorModel.getAvailableSlots(id, date);

    // Generate available time slots (9 AM to 5 PM, 30-minute intervals)
    const slots = [];
    const startHour = 9;
    const endHour = 17;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

        // Check if this slot conflicts with existing appointments
        const isBooked = existingAppointments.some((apt) => {
          const appointmentTime = apt.appointment_time;
          const appointmentEndTime = new Date(`1970-01-01T${appointmentTime}`);
          appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + apt.duration_minutes);

          const slotTime = new Date(`1970-01-01T${timeStr}`);
          const slotEndTime = new Date(slotTime);
          slotEndTime.setMinutes(slotEndTime.getMinutes() + 30);

          return !(
            slotEndTime <= new Date(`1970-01-01T${appointmentTime}`) ||
            slotTime >= appointmentEndTime
          );
        });

        slots.push({
          time: timeStr,
          available: !isBooked,
        });
      }
    }

    res.json({
      doctor_id: id,
      doctor_name: doctor.full_name,
      date: date,
      slots: slots,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new doctor
router.post('/doctors', async (req, res) => {
  try {
    const { full_name, department_id, phone, email } = req.body;

    if (!full_name || !department_id) {
      return res.status(400).json({ message: 'Full name and department are required' });
    }

    const doctorModel = new Doctor(req.app.locals.db);
    const doctorId = await doctorModel.create({ full_name, department_id, phone, email });

    res.status(201).json({
      message: 'Doctor created successfully',
      doctor: { id: doctorId, full_name, department_id, phone, email },
    });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      res.status(400).json({ message: 'Invalid department ID' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Update doctor
router.put('/doctors/:id', async (req, res) => {
  try {
    const { full_name, department_id, phone, email } = req.body;

    if (!full_name || !department_id) {
      return res.status(400).json({ message: 'Full name and department are required' });
    }

    const doctorModel = new Doctor(req.app.locals.db);
    const updated = await doctorModel.updateById(req.params.id, {
      full_name,
      department_id,
      phone,
      email,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ message: 'Doctor updated successfully' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      res.status(400).json({ message: 'Invalid department ID' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Delete doctor
router.delete('/doctors/:id', async (req, res) => {
  try {
    const doctorModel = new Doctor(req.app.locals.db);
    const deleted = await doctorModel.deleteById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ message: 'Doctor deleted successfully' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).json({ message: 'Cannot delete doctor who has appointments' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// ===== APPOINTMENT ROUTES =====

// Get all appointments with details - OPTIMIZED with view
router.get('/appointments', async (req, res) => {
  try {
    const { status, doctor_id, patient_id, date } = req.query;

    let query = 'SELECT * FROM vw_appointment_details WHERE 1=1';
    const params = [];

    // Add filters
    if (doctor_id) {
      query += ' AND doctor_id = ?';
      params.push(doctor_id);
    }

    if (patient_id) {
      query += ' AND patient_id = $' + (params.length + 1);
      params.push(patient_id);
    }

    if (date) {
      query += ' AND appointment_date = $' + (params.length + 1);
      params.push(date);
    }

    if (status) {
      query += ' AND status = $' + (params.length + 1);
      params.push(status);
    }

    query += ' ORDER BY appointment_date DESC, appointment_time DESC';

    const result = await req.app.locals.db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error loading appointments:', err);
    // Fallback to original method
    try {
      const { status, doctor_id, patient_id, date } = req.query;
      const appointmentModel = new Appointment(req.app.locals.db);

      let appointments;

      if (doctor_id) {
        appointments = await appointmentModel.findByDoctor(doctor_id, date);
      } else if (patient_id) {
        appointments = await appointmentModel.findByPatient(patient_id);
      } else {
        appointments = await appointmentModel.findAll();
      }

      // Filter by status if provided
      if (status) {
        appointments = appointments.filter((apt) => apt.status === status);
      }

      res.json(appointments);
    } catch (fallbackErr) {
      console.error('Fallback appointments error:', fallbackErr);
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Get appointment by ID
router.get('/appointments/:id', async (req, res) => {
  try {
    const appointmentModel = new Appointment(req.app.locals.db);
    const appointment = await appointmentModel.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get appointment statistics - OPTIMIZED with view
router.get('/appointments/stats/overview', async (req, res) => {
  try {
    // Use optimized view for faster stats
    const result = await req.app.locals.db.query('SELECT * FROM vw_dashboard_stats');

    if (result.rows.length > 0) {
      const stats = result.rows[0];
      res.json({
        total: stats.total_appointments,
        today: stats.today_appointments,
        byStatus: {
          scheduled: stats.scheduled_appointments,
          completed: stats.completed_appointments,
          cancelled: stats.cancelled_appointments,
        },
      });
    } else {
      // Fallback to original method if view doesn't exist
      const appointmentModel = new Appointment(req.app.locals.db);
      const stats = await appointmentModel.getStats();
      res.json(stats);
    }
  } catch (err) {
    console.error('Error getting stats:', err);
    // Fallback to original method
    try {
      const appointmentModel = new Appointment(req.app.locals.db);
      const stats = await appointmentModel.getStats();
      res.json(stats);
    } catch (fallbackErr) {
      console.error('Fallback stats error:', fallbackErr);
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Create new appointment with enhanced validation and conflict checking
router.post('/appointments', async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      duration_minutes = 30,
      notes = '',
    } = req.body;

    // Enhanced input validation
    const validationErrors = validateInput(
      {
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        duration_minutes,
        notes,
      },
      {
        patient_id: {
          required: true,
          custom: (value) => Number.isInteger(Number(value)) && Number(value) > 0,
          customMessage: 'Patient ID must be a positive integer',
        },
        doctor_id: {
          required: true,
          custom: (value) => Number.isInteger(Number(value)) && Number(value) > 0,
          customMessage: 'Doctor ID must be a positive integer',
        },
        appointment_date: {
          required: true,
          pattern: /^\d{4}-\d{2}-\d{2}$/,
          custom: (value) => {
            const date = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date >= today;
          },
          customMessage: 'Appointment date must be today or in the future',
        },
        appointment_time: {
          required: true,
          pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/,
          customMessage: 'Time must be in HH:MM format',
        },
        duration_minutes: {
          required: false,
          custom: (value) => {
            const num = Number(value);
            return Number.isInteger(num) && num >= 15 && num <= 240;
          },
          customMessage: 'Duration must be between 15 and 240 minutes',
        },
        notes: {
          required: false,
          maxLength: 500,
          customMessage: 'Notes cannot exceed 500 characters',
        },
      }
    );

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors,
        error: 'VALIDATION_ERROR',
      });
    }

    const appointmentModel = new Appointment(req.app.locals.db);
    const patientModel = new Patient(req.app.locals.db);
    const doctorModel = new Doctor(req.app.locals.db);

    // Verify patient exists
    const patient = await patientModel.findById(patient_id);
    if (!patient) {
      return res.status(404).json({
        message: 'Patient not found',
        error: 'PATIENT_NOT_FOUND',
        field: 'patient_id',
      });
    }

    // Verify doctor exists
    const doctor = await doctorModel.findById(doctor_id);
    if (!doctor) {
      return res.status(404).json({
        message: 'Doctor not found',
        error: 'DOCTOR_NOT_FOUND',
        field: 'doctor_id',
      });
    }

    // Enhanced conflict checking with detailed response
    try {
      const conflictResult = await req.app.locals.db.query(
        'SELECT check_appointment_conflict($1, $2, $3, $4, NULL) as has_conflict',
        [doctor_id, appointment_date, appointment_time, duration_minutes]
      );

      if (conflictResult.rows[0].has_conflict) {
        // Get conflicting appointments for detailed response
        const conflicts = await req.app.locals.db.query(
          `SELECT a.id, a.appointment_time, a.duration_minutes, p.full_name as patient_name
           FROM appointments a
           JOIN patients p ON a.patient_id = p.id
           WHERE a.doctor_id = $1 AND a.appointment_date = $2 AND a.status != 'cancelled'
           AND a.appointment_time < ($3::TIME + ($4 || ' minutes')::INTERVAL)
           AND (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL) > $3::TIME`,
          [doctor_id, appointment_date, appointment_time, duration_minutes]
        );

        return res.status(409).json({
          message: 'This time slot conflicts with existing appointments',
          error: 'TIME_CONFLICT',
          conflicts: conflicts.rows,
          suggestion: 'Please choose a different time slot',
        });
      }
    } catch (funcErr) {
      // Fallback to original conflict checking
      console.warn('Using fallback conflict checking:', funcErr.message);

      const hasOverlap = await appointmentModel.checkOverlap(
        doctor_id,
        appointment_date,
        appointment_time,
        duration_minutes
      );

      if (hasOverlap) {
        return res.status(409).json({
          message: 'This time slot conflicts with an existing appointment',
          error: 'TIME_CONFLICT',
          suggestion: 'Please choose a different time slot',
        });
      }
    }

    // Create appointment with sanitized data
    const appointmentData = {
      patient_id: parseInt(patient_id),
      doctor_id: parseInt(doctor_id),
      appointment_date,
      appointment_time,
      duration_minutes: parseInt(duration_minutes),
      status: 'scheduled',
      notes: notes.trim(),
    };

    const appointmentId = await appointmentModel.create(appointmentData);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        id: appointmentId,
        ...appointmentData,
        patient_name: patient.full_name,
        doctor_name: doctor.full_name,
      },
      success: true,
    });
  } catch (err) {
    handleDatabaseError(err, res, 'creating appointment');
  }
});

// Legacy route for simple appointment booking (for backward compatibility)
router.post('/appointments/simple', async (req, res) => {
  try {
    const { name, phone, department, date, time } = req.body;

    if (!name || !phone || !department || !date || !time) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const patientModel = new Patient(req.app.locals.db);
    const doctorModel = new Doctor(req.app.locals.db);
    const appointmentModel = new Appointment(req.app.locals.db);

    // Find or create patient
    let patient = await patientModel.findByPhone(phone);
    if (!patient) {
      const patientId = await patientModel.create({
        full_name: name,
        phone: phone,
        email: '',
      });
      patient = { id: patientId, full_name: name, phone: phone };
    }

    // Find doctors in the department
    const result = await req.app.locals.db.query('SELECT id FROM departments WHERE name = $1', [
      department,
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Department not found' });
    }

    const doctors = await doctorModel.findByDepartment(result.rows[0].id);
    if (doctors.length === 0) {
      return res.status(400).json({ message: 'No doctors available in this department' });
    }

    // Use the first available doctor (in a real system, you'd have better logic)
    const doctor = doctors[0];

    // Check for overlapping appointments
    const hasOverlap = await appointmentModel.checkOverlap(
      doctor.id,
      date,
      time,
      30 // default 30 minutes
    );

    if (hasOverlap) {
      return res.status(400).json({
        message: 'This time slot is not available. Please choose a different time.',
      });
    }

    // Create appointment
    const appointmentId = await appointmentModel.create({
      patient_id: patient.id,
      doctor_id: doctor.id,
      appointment_date: date,
      appointment_time: time,
      duration_minutes: 30,
      status: 'scheduled',
      notes: '',
    });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        id: appointmentId,
        patient_name: patient.full_name,
        doctor_name: doctor.full_name,
        department: department,
        date: date,
        time: time,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment
router.put('/appointments/:id', async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      duration_minutes,
      status,
      notes,
    } = req.body;

    const appointmentModel = new Appointment(req.app.locals.db);

    // If updating time-related fields, check for overlaps
    if (doctor_id && appointment_date && appointment_time && duration_minutes) {
      const hasOverlap = await appointmentModel.checkOverlap(
        doctor_id,
        appointment_date,
        appointment_time,
        duration_minutes,
        req.params.id // exclude current appointment
      );

      if (hasOverlap) {
        return res.status(400).json({
          message: 'This time slot conflicts with an existing appointment for this doctor',
        });
      }
    }

    const updated = await appointmentModel.updateById(req.params.id, {
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      duration_minutes,
      status,
      notes,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({ message: 'Appointment updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment status only with enhanced validation
router.patch('/appointments/:id/status', async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { status } = req.body;

    // Validate appointment ID
    if (!appointmentId || !Number.isInteger(Number(appointmentId)) || Number(appointmentId) <= 0) {
      return res.status(400).json({
        message: 'Invalid appointment ID',
        error: 'INVALID_ID',
        field: 'id',
      });
    }

    // Validate status
    const validStatuses = ['scheduled', 'checked_in', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status value',
        error: 'INVALID_STATUS',
        validStatuses: validStatuses,
        field: 'status',
      });
    }

    const appointmentModel = new Appointment(req.app.locals.db);

    // Check if appointment exists
    const existingAppointment = await appointmentModel.findById(appointmentId);
    if (!existingAppointment) {
      return res.status(404).json({
        message: 'Appointment not found',
        error: 'APPOINTMENT_NOT_FOUND',
        field: 'id',
      });
    }

    // Prevent status changes to cancelled for completed appointments
    if (existingAppointment.status === 'completed' && status === 'cancelled') {
      return res.status(400).json({
        message: 'Cannot cancel a completed appointment',
        error: 'INVALID_STATUS_TRANSITION',
        field: 'status',
      });
    }

    const updated = await appointmentModel.updateById(appointmentId, { status });

    if (!updated) {
      return res.status(404).json({
        message: 'Appointment not found',
        error: 'APPOINTMENT_NOT_FOUND',
        field: 'id',
      });
    }

    res.json({
      message: `Appointment status updated to ${status} successfully`,
      appointment: {
        id: appointmentId,
        status: status,
      },
      success: true,
    });
  } catch (err) {
    handleDatabaseError(err, res, 'updating appointment status');
  }
});

// Delete appointment
router.delete('/appointments/:id', async (req, res) => {
  try {
    const appointmentModel = new Appointment(req.app.locals.db);
    const deleted = await appointmentModel.deleteById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
