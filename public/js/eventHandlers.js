// Event Handlers - Binds all DOM event listeners from JavaScript
// This follows CSP best practices by avoiding inline event handlers

document.addEventListener('DOMContentLoaded', () => {
  // ═══════════════════════════════════════════════════════════════════
  // NAVIGATION HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  // Theme toggle
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Navigation links (Navbar)
  const navLinks = {
    'dashboard-nav': 'dashboard',
    'appointments-nav': 'appointments',
    'patients-nav': 'patients',
    'doctors-nav': 'doctors',
    'admin-nav': 'admin',
  };

  Object.entries(navLinks).forEach(([elementId, section]) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(section, e);
      });
    }
  });

  // Navigation pills (Section switcher buttons)
  const navPills = {
    'dashboard-pill': 'dashboard',
    'appointments-pill': 'appointments',
    'patients-pill': 'patients',
    'doctors-pill': 'doctors',
    'admin-pill': 'admin',
  };

  Object.entries(navPills).forEach(([elementId, section]) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(section, e);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // FORM EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  // Patient form submission
  const patientForm = document.getElementById('patientForm');
  if (patientForm) {
    patientForm.addEventListener('submit', (e) => {
      e.preventDefault();
      createPatient();
    });
  }

  // Doctor form submission
  const doctorForm = document.getElementById('doctorForm');
  if (doctorForm) {
    doctorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      createDoctor();
    });
  }

  // Department form submission
  const departmentForm = document.getElementById('departmentForm');
  if (departmentForm) {
    departmentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      createDepartment();
    });
  }

  // Appointment form submission
  const appointmentForm = document.getElementById('appointmentForm');
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      bookAppointment();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // DROPDOWN/SELECT EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  // Department dropdown for doctors
  const departmentSelect = document.getElementById('departmentSelect');
  if (departmentSelect) {
    departmentSelect.addEventListener('change', loadDoctorsByDepartment);
  }

  // Doctor dropdown for appointment booking
  const doctorSelect = document.getElementById('doctorSelect');
  if (doctorSelect) {
    doctorSelect.addEventListener('change', loadAvailableSlots);
  }

  // Date input for appointment booking
  const appointmentDate = document.getElementById('appointmentDate');
  if (appointmentDate) {
    appointmentDate.addEventListener('change', loadAvailableSlots);
  }

  // ═══════════════════════════════════════════════════════════════════
  // REFRESH BUTTON HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  // Refresh patients button
  const refreshPatientsBtn = document.getElementById('refreshPatientsBtn');
  if (refreshPatientsBtn) {
    refreshPatientsBtn.addEventListener('click', () => {
      loadPatients();
    });
  }

  // Refresh doctors button
  const refreshDoctorsBtn = document.getElementById('refreshDoctorsBtn');
  if (refreshDoctorsBtn) {
    refreshDoctorsBtn.addEventListener('click', () => {
      loadDoctors();
    });
  }

  // Refresh departments button
  const refreshDepartmentsBtn = document.getElementById('refreshDepartmentsBtn');
  if (refreshDepartmentsBtn) {
    refreshDepartmentsBtn.addEventListener('click', () => {
      loadDepartments();
    });
  }

  // Refresh appointments button
  const refreshAppointmentsBtn = document.getElementById('refreshAppointmentsBtn');
  if (refreshAppointmentsBtn) {
    refreshAppointmentsBtn.addEventListener('click', () => {
      loadAllAppointments();
    });
  }
});
