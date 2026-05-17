// Consolidated Models - PostgreSQL Version
// All database models using pg (node-postgres) syntax
const User = require('./User');

// Department Model
class Department {
  constructor(db) {
    this.db = db;
  }

  async create({ name }) {
    const result = await this.db.query('INSERT INTO departments (name) VALUES ($1) RETURNING id', [
      name,
    ]);
    return result.rows[0].id;
  }

  async findAll() {
    const result = await this.db.query('SELECT * FROM departments ORDER BY name ASC');
    return result.rows;
  }

  async findById(id) {
    const result = await this.db.query('SELECT * FROM departments WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async updateById(id, { name }) {
    const result = await this.db.query(
      'UPDATE departments SET name = $1 WHERE id = $2 RETURNING id',
      [name, id]
    );
    return result.rowCount > 0;
  }

  async deleteById(id) {
    const result = await this.db.query('DELETE FROM departments WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}

// Patient Model
class Patient {
  constructor(db) {
    this.db = db;
  }

  async create({ full_name, phone, email }) {
    const result = await this.db.query(
      'INSERT INTO patients (full_name, phone, email) VALUES ($1, $2, $3) RETURNING id',
      [full_name, phone, email]
    );
    return result.rows[0].id;
  }

  async findAll() {
    const result = await this.db.query('SELECT * FROM patients ORDER BY full_name ASC');
    return result.rows;
  }

  async findById(id) {
    const result = await this.db.query('SELECT * FROM patients WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByPhone(phone) {
    const result = await this.db.query('SELECT * FROM patients WHERE phone = $1', [phone]);
    return result.rows[0] || null;
  }

  async updateById(id, { full_name, phone, email }) {
    const result = await this.db.query(
      'UPDATE patients SET full_name = $1, phone = $2, email = $3 WHERE id = $4 RETURNING id',
      [full_name, phone, email, id]
    );
    return result.rowCount > 0;
  }

  async deleteById(id) {
    const result = await this.db.query('DELETE FROM patients WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async searchByName(searchTerm) {
    const result = await this.db.query(
      'SELECT * FROM patients WHERE full_name ILIKE $1 ORDER BY full_name ASC',
      [`%${searchTerm}%`]
    );
    return result.rows;
  }
}

// Doctor Model
class Doctor {
  constructor(db) {
    this.db = db;
  }

  async create({ full_name, department_id, phone, email }) {
    const result = await this.db.query(
      'INSERT INTO doctors (full_name, department_id, phone, email) VALUES ($1, $2, $3, $4) RETURNING id',
      [full_name, department_id, phone, email]
    );
    return result.rows[0].id;
  }

  async findAll() {
    const result = await this.db.query(`
      SELECT 
        d.id, 
        d.full_name, 
        d.department_id, 
        d.phone, 
        d.email, 
        d.created_at,
        dept.name as department_name
      FROM doctors d 
      LEFT JOIN departments dept ON d.department_id = dept.id 
      ORDER BY d.full_name ASC
    `);
    return result.rows;
  }

  async findById(id) {
    const result = await this.db.query(
      `
      SELECT 
        d.id, 
        d.full_name, 
        d.department_id, 
        d.phone, 
        d.email, 
        d.created_at,
        dept.name as department_name
      FROM doctors d 
      LEFT JOIN departments dept ON d.department_id = dept.id 
      WHERE d.id = $1
    `,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByDepartment(department_id) {
    const result = await this.db.query(
      `
      SELECT 
        d.id, 
        d.full_name, 
        d.department_id, 
        d.phone, 
        d.email, 
        d.created_at,
        dept.name as department_name
      FROM doctors d 
      LEFT JOIN departments dept ON d.department_id = dept.id 
      WHERE d.department_id = $1
      ORDER BY d.full_name ASC
    `,
      [department_id]
    );
    return result.rows;
  }

  async updateById(id, { full_name, department_id, phone, email }) {
    const result = await this.db.query(
      'UPDATE doctors SET full_name = $1, department_id = $2, phone = $3, email = $4 WHERE id = $5 RETURNING id',
      [full_name, department_id, phone, email, id]
    );
    return result.rowCount > 0;
  }

  async deleteById(id) {
    const result = await this.db.query('DELETE FROM doctors WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async getAvailableSlots(doctor_id, date) {
    const result = await this.db.query(
      `
      SELECT appointment_time, duration_minutes 
      FROM appointments 
      WHERE doctor_id = $1 AND appointment_date = $2 AND status != 'cancelled'
      ORDER BY appointment_time ASC
    `,
      [doctor_id, date]
    );

    return result.rows;
  }
}

// Appointment Model
class Appointment {
  constructor(db) {
    this.db = db;
  }

  async create({
    patient_id,
    doctor_id,
    appointment_date,
    appointment_time,
    duration_minutes = 30,
    status = 'scheduled',
    notes = '',
  }) {
    const result = await this.db.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration_minutes, status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [patient_id, doctor_id, appointment_date, appointment_time, duration_minutes, status, notes]
    );
    return result.rows[0].id;
  }

  async findAll() {
    const result = await this.db.query(`
      SELECT 
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.duration_minutes,
        a.status,
        a.notes,
        a.created_at,
        p.full_name as patient_name,
        p.phone as patient_phone,
        d.full_name as doctor_name,
        dept.name as department_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `);
    return result.rows;
  }

  async findById(id) {
    const result = await this.db.query(
      `
      SELECT 
        a.*,
        p.full_name as patient_name,
        p.phone as patient_phone,
        d.full_name as doctor_name,
        dept.name as department_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE a.id = $1
    `,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByPatient(patient_id) {
    const result = await this.db.query(
      `
      SELECT 
        a.*,
        d.full_name as doctor_name,
        dept.name as department_name
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE a.patient_id = $1
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `,
      [patient_id]
    );
    return result.rows;
  }

  async findByDoctor(doctor_id, date = null) {
    let query = `
      SELECT 
        a.*,
        p.full_name as patient_name,
        p.phone as patient_phone
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      WHERE a.doctor_id = $1
    `;

    const params = [doctor_id];

    if (date) {
      query += ' AND a.appointment_date = $2';
      params.push(date);
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async updateById(id, updateData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updateData.patient_id !== undefined) {
      fields.push(`patient_id = $${paramIndex++}`);
      values.push(updateData.patient_id);
    }
    if (updateData.doctor_id !== undefined) {
      fields.push(`doctor_id = $${paramIndex++}`);
      values.push(updateData.doctor_id);
    }
    if (updateData.appointment_date !== undefined) {
      fields.push(`appointment_date = $${paramIndex++}`);
      values.push(updateData.appointment_date);
    }
    if (updateData.appointment_time !== undefined) {
      fields.push(`appointment_time = $${paramIndex++}`);
      values.push(updateData.appointment_time);
    }
    if (updateData.duration_minutes !== undefined) {
      fields.push(`duration_minutes = $${paramIndex++}`);
      values.push(updateData.duration_minutes);
    }
    if (updateData.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updateData.status);
    }
    if (updateData.notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      values.push(updateData.notes);
    }

    if (fields.length === 0) return false;

    values.push(id);

    const result = await this.db.query(
      `UPDATE appointments SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    return result.rowCount > 0;
  }

  async deleteById(id) {
    const result = await this.db.query('DELETE FROM appointments WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async checkOverlap(
    doctor_id,
    appointment_date,
    appointment_time,
    duration_minutes,
    exclude_id = null
  ) {
    let query = `
      SELECT COUNT(*) as count
      FROM appointments
      WHERE doctor_id = $1 
        AND appointment_date = $2
        AND status != 'cancelled'
        AND (
          (appointment_time <= $3 AND (appointment_time + (duration_minutes || ' minutes')::INTERVAL) > $3::TIME) OR
          (appointment_time < ($3::TIME + ($4 || ' minutes')::INTERVAL) AND (appointment_time + (duration_minutes || ' minutes')::INTERVAL) >= ($3::TIME + ($4 || ' minutes')::INTERVAL))
        )
    `;

    const params = [doctor_id, appointment_date, appointment_time, duration_minutes];

    if (exclude_id) {
      query += ' AND id != $5';
      params.push(exclude_id);
    }

    const result = await this.db.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }

  async getStats() {
    const totalResult = await this.db.query('SELECT COUNT(*) as count FROM appointments');
    const todayResult = await this.db.query(
      'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = CURRENT_DATE'
    );
    const statusResult = await this.db.query(`
      SELECT status, COUNT(*) as count 
      FROM appointments 
      GROUP BY status
    `);

    const statusCounts = {};
    statusResult.rows.forEach((row) => {
      statusCounts[row.status] = parseInt(row.count);
    });

    return {
      total: parseInt(totalResult.rows[0].count),
      today: parseInt(todayResult.rows[0].count),
      byStatus: statusCounts,
    };
  }
}

module.exports = {
  Department,
  Patient,
  Doctor,
  Appointment,
  User,
};
