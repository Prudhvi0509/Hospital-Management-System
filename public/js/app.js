// Hospital Management System JavaScript Application
const API_BASE = '';
let currentPatientId = null;

// Global variables for data
let departments = [];
let patients = [];
let doctors = [];
let appointments = [];

// Theme management
function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  
  body.classList.toggle('dark-theme');
  
  if (body.classList.contains('dark-theme')) {
    themeIcon.className = 'bi bi-sun-fill';
    localStorage.setItem('theme', 'dark');
  } else {
    themeIcon.className = 'bi bi-moon-fill';
    localStorage.setItem('theme', 'light');
  }
}

// Initialize theme on page load
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  const themeIcon = document.getElementById('theme-icon');
  
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeIcon.className = 'bi bi-sun-fill';
  }
}

// Enhanced notification system with better error handling
function showNotification(message, type = 'info', duration = 5000) {
  let container = document.getElementById('notificationContainer');
  
  // Create container if it doesn't exist
  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  
  const notification = document.createElement('div');
  notification.className = `toast-notification alert alert-${type} alert-dismissible`;
  notification.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <span><i class="bi bi-${getNotificationIcon(type)}"></i> ${message}</span>
      <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    </div>
  `;
  
  // Add slide-in animation
  notification.style.transform = 'translateX(100%)';
  notification.style.transition = 'transform 0.3s ease';
  
  container.appendChild(notification);
  
  // Trigger slide-in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // Auto remove after duration
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }
  }, duration);
}

// Get appropriate icon for notification type
function getNotificationIcon(type) {
  switch(type) {
    case 'success': return 'check-circle-fill';
    case 'danger': return 'exclamation-triangle-fill';
    case 'warning': return 'exclamation-circle-fill';
    case 'info': return 'info-circle-fill';
    default: return 'info-circle';
  }
}

// Scroll animation observer
function initializeScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  });
  
  document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
  });
}

// Section navigation
function showSection(sectionName, event) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.add('hidden');
  });
  
  // Remove active class from all nav sections
  document.querySelectorAll('.nav-section').forEach(nav => {
    nav.classList.remove('active');
  });
  
  // Show selected section with null check
  const targetSection = document.getElementById(sectionName + '-section');
  if (targetSection) {
    targetSection.classList.remove('hidden');
  } else {
    console.error(`Section with id "${sectionName}-section" not found`);
  }
  
  // Add active class to clicked nav if event is provided
  if (event && event.target) {
    const navSection = event.target.closest('.nav-section');
    if (navSection) {
      navSection.classList.add('active');
    }
  }
  
  // Load data for the section
  loadSectionData(sectionName);
}

function loadSectionData(sectionName) {
  switch(sectionName) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'appointments':
      loadDepartments();
      break;
    case 'patients':
      loadPatients();
      break;
    case 'doctors':
      loadAllDoctors();
      loadDepartmentsForDoctors();
      break;
    case 'admin':
      loadDepartmentsAdmin();
      loadAllAppointments();
      break;
  }
}

// Dashboard functions with enhanced error handling
async function loadDashboardData() {
  // Show loading indicator
  showLoadingState('dashboard');
  
  try {
    // Check network connectivity
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network.');
    }
    
    const [departmentsRes, patientsRes, doctorsRes, appointmentsRes, statsRes] = await Promise.all([
      fetch('/api/departments'),
      fetch('/api/patients'),
      fetch('/api/doctors'),
      fetch('/api/appointments'),
      fetch('/api/appointments/stats/overview')
    ]);
    
    // Check if all requests were successful
    const responses = [departmentsRes, patientsRes, doctorsRes, appointmentsRes];
    for (const response of responses) {
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText} (${response.status})`);
      }
    }

    const departmentsData = await departmentsRes.json();
    const patientsData = await patientsRes.json();
    const doctorsData = await doctorsRes.json();
    const appointmentsData = await appointmentsRes.json();
    const statsData = statsRes.ok ? await statsRes.json() : { byStatus: {}, by_department: [] };

    // Update counters with defensive checks
    document.getElementById('total-departments').textContent = Array.isArray(departmentsData) ? departmentsData.length : 0;
    document.getElementById('total-patients').textContent = Array.isArray(patientsData) ? patientsData.length : 0;
    document.getElementById('total-doctors').textContent = Array.isArray(doctorsData) ? doctorsData.length : 0;
    document.getElementById('total-appointments').textContent = Array.isArray(appointmentsData) ? appointmentsData.length : 0;

    // Load today's appointments
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = Array.isArray(appointmentsData) 
      ? appointmentsData.filter(apt => apt.appointment_date && apt.appointment_date.split('T')[0] === today)
      : [];
    
    const todayContainer = document.getElementById('today-appointments');
    if (todayAppointments.length === 0) {
      todayContainer.innerHTML = '<p class="text-muted">No appointments today</p>';
    } else {
      todayContainer.innerHTML = todayAppointments.map(apt => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
          <div>
            <strong>${apt.patient_name || 'Unknown Patient'}</strong><br>
            <small class="text-muted">Dr. ${apt.doctor_name || 'Unknown Doctor'} - ${apt.department_name || 'Unknown Department'}</small>
          </div>
          <div class="text-end">
            <span class="badge bg-primary">${apt.appointment_time || 'N/A'}</span><br>
            <span class="badge status-badge bg-${getStatusColor(apt.status || 'scheduled')}">${apt.status || 'scheduled'}</span>
          </div>
        </div>
      `).join('');
    }

    // Load stats with defensive checks
    const statsContainer = document.getElementById('appointment-stats');
    const byStatusData = statsData && statsData.byStatus ? statsData.byStatus : {};
    const statusEntries = Object.entries(byStatusData);
    
    if (statusEntries.length === 0) {
      statsContainer.innerHTML = '<p class="text-muted">No statistics available</p>';
    } else {
      statsContainer.innerHTML = statusEntries.map(([status, count]) => `
        <div class="d-flex justify-content-between py-1">
          <span class="text-capitalize">${status}:</span>
          <span class="badge bg-${getStatusColor(status)}">${count}</span>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error('Error loading dashboard:', err);
    
    // Show user-friendly error message
    const errorMessage = err.message.includes('Failed to fetch') 
      ? 'Unable to connect to server. Please check your internet connection and try again.'
      : err.message || 'Failed to load dashboard data. Please refresh the page.';
    
    showMessage('dashboard-message', errorMessage, 'danger', err);
    
    // Hide loading state and show retry option
    hideLoadingState('dashboard');
    showRetryOption('dashboard', loadDashboardData);
  } finally {
    hideLoadingState('dashboard');
  }
}

// Loading state management
function showLoadingState(section) {
  const indicators = document.querySelectorAll(`#${section}-section .loading-indicator`);
  indicators.forEach(indicator => {
    indicator.style.display = 'block';
  });
  
  // Add loading class to section
  const sectionElement = document.getElementById(`${section}-section`);
  if (sectionElement) {
    sectionElement.classList.add('loading');
  }
}

function hideLoadingState(section) {
  const indicators = document.querySelectorAll(`#${section}-section .loading-indicator`);
  indicators.forEach(indicator => {
    indicator.style.display = 'none';
  });
  
  // Remove loading class from section
  const sectionElement = document.getElementById(`${section}-section`);
  if (sectionElement) {
    sectionElement.classList.remove('loading');
  }
}

// Retry functionality
function showRetryOption(section, retryFunction) {
  const retryContainer = document.getElementById(`${section}-retry`) || createRetryContainer(section);
  retryContainer.innerHTML = `
    <div class="alert alert-warning text-center">
      <i class="bi bi-exclamation-triangle"></i> Failed to load data.
      <button class="btn btn-warning btn-sm ms-2" onclick="${retryFunction.name}()">
        <i class="bi bi-arrow-clockwise"></i> Retry
      </button>
    </div>
  `;
  retryContainer.style.display = 'block';
}

function createRetryContainer(section) {
  const container = document.createElement('div');
  container.id = `${section}-retry`;
  container.className = 'retry-container';
  container.style.display = 'none';
  
  const sectionElement = document.getElementById(`${section}-section`);
  if (sectionElement) {
    sectionElement.insertBefore(container, sectionElement.firstChild);
  }
  
  return container;
}

function getStatusColor(status) {
  switch(status) {
    case 'scheduled': return 'primary';
    case 'checked_in': return 'info';
    case 'completed': return 'success';
    case 'cancelled': return 'danger';
    default: return 'secondary';
  }
}

// Utility function with enhanced notifications and error logging
function showMessage(elementId, message, type, error = null) {
  // Log error for debugging if provided
  if (error) {
    console.error('Error details:', error);
    
    // Send error to monitoring service if available
    if (typeof sendErrorToMonitoring === 'function') {
      sendErrorToMonitoring(error, message);
    }
  }
  
  // Show in element if exists
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div class="alert alert-${type} alert-dismissible">
      <i class="bi bi-${getNotificationIcon(type)}"></i> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
    
    // Auto-hide after 8 seconds for inline messages
    setTimeout(() => {
      if (element && element.innerHTML) {
        element.innerHTML = '';
      }
    }, 8000);
  }
  
  // Also show as toast notification
  showNotification(message, type);
}

// Set minimum date to today
function initializeDateInputs() {
  const dateInput = document.getElementById('appointmentDate');
  if (dateInput) {
    dateInput.min = new Date().toISOString().split('T')[0];
  }
}

// Advanced Search and Filtering functionality
class AdvancedSearch {
  constructor() {
    this.debounceTimer = null;
    this.init();
  }

  init() {
    this.addSearchToTables();
    this.attachSearchListeners();
  }

  addSearchToTables() {
    // Add search boxes to existing tables
    this.addSearchBox('appointments-list', 'appointments');
    this.addSearchBox('patients-list', 'patients');
    this.addSearchBox('doctors-list', 'doctors');
  }

  addSearchBox(tableId, type) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tableContainer = table.closest('.table-responsive') || table.closest('.card-body');
    if (!tableContainer) return;

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container mb-3';
    searchContainer.innerHTML = `
      <div class="row align-items-center">
        <div class="col-md-6">
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="text" class="form-control" 
                   placeholder="Search ${type}..." 
                   id="search-${type}"
                   autocomplete="off">
            <button class="btn btn-outline-secondary" type="button" 
                    onclick="advancedSearch.clearSearch('${type}')">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        <div class="col-md-6">
          <div class="btn-group">
            <button class="btn btn-outline-primary btn-sm" 
                    onclick="advancedSearch.quickFilter('${type}', 'today')">
              <i class="bi bi-calendar-day"></i> Today
            </button>
            <button class="btn btn-outline-success btn-sm" 
                    onclick="advancedSearch.quickFilter('${type}', 'active')">
              <i class="bi bi-check-circle"></i> Active
            </button>
            <button class="btn btn-outline-info btn-sm" 
                    onclick="advancedSearch.exportData('${type}')">
              <i class="bi bi-download"></i> Export
            </button>
          </div>
        </div>
      </div>
    `;

    tableContainer.insertBefore(searchContainer, table.parentElement);
  }

  attachSearchListeners() {
    // Real-time search with debouncing
    document.addEventListener('input', (e) => {
      if (e.target.id && e.target.id.startsWith('search-')) {
        const type = e.target.id.replace('search-', '');
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.performSearch(type, e.target.value);
        }, 300);
      }
    });
  }

  async performSearch(type, query) {
    if (query.length < 2) {
      this.resetTable(type);
      return;
    }

    try {
      const results = await this.searchData(type, query);
      this.displayResults(type, results);
      showNotification(`Found ${results.length} results`, 'info', 2000);
    } catch (error) {
      console.error('Search error:', error);
      
      const errorMessage = error.message.includes('Failed to fetch')
        ? 'Search failed due to network error. Please check your connection.'
        : 'Search failed. Please try again.';
      
      showNotification(errorMessage, 'danger');
      
      // Reset search if there's an error
      this.resetTable(type);
    }
  }

  async searchData(type, query) {
    switch (type) {
      case 'appointments':
        const appointmentsRes = await fetch('/api/appointments');
        const appointments = await appointmentsRes.json();
        return appointments.filter(apt => 
          apt.patient_name?.toLowerCase().includes(query.toLowerCase()) ||
          apt.doctor_name?.toLowerCase().includes(query.toLowerCase()) ||
          apt.department_name?.toLowerCase().includes(query.toLowerCase()) ||
          apt.status?.toLowerCase().includes(query.toLowerCase())
        );
      
      case 'patients':
        const patientsRes = await fetch('/api/patients');
        const patients = await patientsRes.json();
        return patients.filter(patient => 
          patient.full_name?.toLowerCase().includes(query.toLowerCase()) ||
          patient.phone?.includes(query) ||
          patient.email?.toLowerCase().includes(query.toLowerCase())
        );
      
      case 'doctors':
        const doctorsRes = await fetch('/api/doctors');
        const doctors = await doctorsRes.json();
        return doctors.filter(doctor => 
          doctor.full_name?.toLowerCase().includes(query.toLowerCase()) ||
          doctor.department_name?.toLowerCase().includes(query.toLowerCase()) ||
          doctor.phone?.includes(query)
        );
      
      default:
        return [];
    }
  }

  displayResults(type, results) {
    switch (type) {
      case 'appointments':
        this.displayAppointments(results);
        break;
      case 'patients':
        this.displayPatients(results);
        break;
      case 'doctors':
        this.displayDoctors(results);
        break;
    }
  }

  displayAppointments(appointments) {
    const tbody = document.getElementById('appointments-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No appointments found</td></tr>';
      return;
    }
    
    appointments.forEach(apt => {
      const date = new Date(apt.appointment_date).toLocaleDateString();
      const statusColor = getStatusColor(apt.status);
      
      tbody.innerHTML += `
        <tr class="search-result-row">
          <td>${apt.id}</td>
          <td><strong>${apt.patient_name}</strong></td>
          <td>Dr. ${apt.doctor_name}</td>
          <td>${apt.department_name || 'N/A'}</td>
          <td>${date}</td>
          <td>${apt.appointment_time}</td>
          <td><span class="badge bg-${statusColor}">${apt.status}</span></td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="updateAppointmentStatus(${apt.id}, 'checked_in')">Check In</button>
              <button class="btn btn-outline-success" onclick="updateAppointmentStatus(${apt.id}, 'completed')">Complete</button>
              <button class="btn btn-outline-danger" onclick="updateAppointmentStatus(${apt.id}, 'cancelled')">Cancel</button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  displayPatients(patients) {
    const tbody = document.getElementById('patients-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (patients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No patients found</td></tr>';
      return;
    }
    
    patients.forEach(patient => {
      tbody.innerHTML += `
        <tr class="search-result-row">
          <td>${patient.id}</td>
          <td><strong>${patient.full_name}</strong></td>
          <td>${patient.phone}</td>
          <td>${patient.email || 'N/A'}</td>
          <td>${patient.age || 'N/A'}</td>
          <td>${patient.gender || 'N/A'}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary">Edit</button>
              <button class="btn btn-outline-danger">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  displayDoctors(doctors) {
    const tbody = document.getElementById('doctors-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (doctors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No doctors found</td></tr>';
      return;
    }
    
    doctors.forEach(doctor => {
      tbody.innerHTML += `
        <tr class="search-result-row">
          <td>${doctor.id}</td>
          <td><strong>${doctor.full_name}</strong></td>
          <td>${doctor.phone}</td>
          <td>${doctor.department_name}</td>
          <td>${doctor.specialization || 'N/A'}</td>
          <td>${doctor.experience || 'N/A'}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary">Edit</button>
              <button class="btn btn-outline-danger">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  quickFilter(type, filterType) {
    const today = new Date().toISOString().split('T')[0];
    
    switch (filterType) {
      case 'today':
        if (type === 'appointments') {
          this.searchData(type, '').then(data => {
            const todayData = data.filter(item => 
              item.appointment_date && item.appointment_date.split('T')[0] === today
            );
            this.displayResults(type, todayData);
            showNotification(`Found ${todayData.length} appointments today`, 'info');
          });
        }
        break;
      
      case 'active':
        if (type === 'appointments') {
          this.searchData(type, '').then(data => {
            const activeData = data.filter(item => 
              item.status === 'scheduled' || item.status === 'checked_in'
            );
            this.displayResults(type, activeData);
            showNotification(`Found ${activeData.length} active appointments`, 'info');
          });
        }
        break;
    }
  }

  clearSearch(type) {
    const searchInput = document.getElementById(`search-${type}`);
    if (searchInput) {
      searchInput.value = '';
      this.resetTable(type);
    }
  }

  resetTable(type) {
    switch (type) {
      case 'appointments':
        if (typeof loadAllAppointments === 'function') loadAllAppointments();
        break;
      case 'patients':
        if (typeof loadPatients === 'function') loadPatients();
        break;
      case 'doctors':
        if (typeof loadAllDoctors === 'function') loadAllDoctors();
        break;
    }
  }

  exportData(type) {
    // Simple CSV export functionality
    const table = document.getElementById(`${type}-list`);
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tr'));
    const csv = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      return cells.map(cell => `"${cell.textContent.trim()}"`).join(',');
    }).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification(`${type} data exported successfully!`, 'success');
  }
}

// Initialize advanced search
let advancedSearch;

// Dashboard Charts functionality
function initializeCharts() {
  // Simple chart using Chart.js if available, otherwise use CSS animations
  if (typeof Chart !== 'undefined') {
    loadChartsWithLibrary();
  } else {
    loadChartsWithCSS();
  }
}

// Error monitoring service (placeholder for future implementation)
function sendErrorToMonitoring(error, context) {
  // This would integrate with services like Sentry, LogRocket, etc.
  console.log('Error logged:', { error, context, timestamp: new Date().toISOString() });
}

function loadChartsWithCSS() {
  // Create animated progress bars for dashboard stats
  const statsContainer = document.getElementById('appointment-stats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-item mb-3">
        <div class="d-flex justify-content-between">
          <span>Scheduled</span>
          <span class="fw-bold">75%</span>
        </div>
        <div class="progress" style="height: 8px;">
          <div class="progress-bar bg-primary" role="progressbar" 
               style="width: 0%; animation: progressFill 2s ease-out forwards; --final-width: 75%;"></div>
        </div>
      </div>
      <div class="stat-item mb-3">
        <div class="d-flex justify-content-between">
          <span>Completed</span>
          <span class="fw-bold">60%</span>
        </div>
        <div class="progress" style="height: 8px;">
          <div class="progress-bar bg-success" role="progressbar" 
               style="width: 0%; animation: progressFill 2s ease-out forwards 0.5s; --final-width: 60%;"></div>
        </div>
      </div>
      <div class="stat-item mb-3">
        <div class="d-flex justify-content-between">
          <span>Cancelled</span>
          <span class="fw-bold">15%</span>
        </div>
        <div class="progress" style="height: 8px;">
          <div class="progress-bar bg-danger" role="progressbar" 
               style="width: 0%; animation: progressFill 2s ease-out forwards 1s; --final-width: 15%;"></div>
        </div>
      </div>
    `;
  }
}

// Notification System
function setupNotificationSystem() {
  // Auto-refresh appointment reminders every 5 minutes
  setInterval(() => {
    checkAppointmentReminders();
  }, 5 * 60 * 1000);
  
  // Initial check
  setTimeout(checkAppointmentReminders, 2000);
}

async function checkAppointmentReminders() {
  try {
    // Only check if online
    if (!navigator.onLine) {
      return;
    }
    
    const response = await fetch('/api/appointments');
    
    if (!response.ok) {
      throw new Error(`Failed to load appointments: ${response.statusText}`);
    }
    
    const appointments = await response.json();
    
    const now = new Date();
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);
    
    // Check for appointments in the next 30 minutes
    const upcomingAppointments = appointments.filter(apt => {
      if (apt.status !== 'scheduled') return false;
      
      const aptDateTime = new Date(`${apt.appointment_date.split('T')[0]}T${apt.appointment_time}`);
      return aptDateTime >= now && aptDateTime <= in30Minutes;
    });
    
    upcomingAppointments.forEach(apt => {
      const aptTime = new Date(`${apt.appointment_date.split('T')[0]}T${apt.appointment_time}`);
      const minutesUntil = Math.round((aptTime - now) / (1000 * 60));
      
      showNotification(
        `Upcoming appointment: ${apt.patient_name} with Dr. ${apt.doctor_name} in ${minutesUntil} minutes`,
        'warning',
        10000
      );
    });
  } catch (error) {
    console.error('Error checking reminders:', error);
    
    // Only show error if it's not a network issue (to avoid spam)
    if (!error.message.includes('Failed to fetch')) {
      showMessage('notification-message', 'Failed to check appointment reminders', 'warning', error);
    }
  }
}

// Network status monitoring
function initializeNetworkMonitoring() {
  window.addEventListener('online', () => {
    showNotification('Connection restored', 'success', 3000);
    // Retry any failed operations
    loadDashboardData();
  });
  
  window.addEventListener('offline', () => {
    showNotification('You are offline. Some features may not work.', 'warning', 5000);
  });
}

// Global error handler for unhandled errors
function initializeGlobalErrorHandler() {
  // Handle JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Don't show error for cross-origin scripts
    if (event.error && event.error.message && !event.error.message.includes('Script error')) {
      showMessage('global-message', 'An unexpected error occurred. Please refresh the page.', 'danger', event.error);
    }
  });
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent default browser error handling
    event.preventDefault();
    
    const errorMessage = event.reason?.message?.includes('Failed to fetch')
      ? 'Network error occurred. Please check your connection.'
      : event.reason?.message || 'An unexpected error occurred.';
    
    showMessage('global-message', errorMessage, 'danger', event.reason);
  });
}

// Error boundary for critical operations
function withErrorBoundary(fn, context = 'operation') {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      console.error(`${context} error:`, error);
      
      const errorMessage = error.message.includes('Failed to fetch')
        ? `Network error during ${context}. Please check your connection.`
        : `Failed to ${context}. Please try again.`;
      
      showMessage('global-message', errorMessage, 'danger', error);
      
      // Send error to monitoring service if available
      if (typeof sendErrorToMonitoring === 'function') {
        sendErrorToMonitoring(error, context);
      }
      
      // Return a safe fallback value
      return null;
    }
  };
}

// Fallback UI for critical components
function createFallbackUI(containerId, message, retryFunction) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="alert alert-warning text-center">
      <i class="bi bi-exclamation-triangle"></i> ${message}
      <br>
      <button class="btn btn-outline-primary btn-sm mt-2" onclick="${retryFunction.name}()">
        <i class="bi bi-arrow-clockwise"></i> Retry
      </button>
      <button class="btn btn-outline-secondary btn-sm mt-2 ms-2" onclick="location.reload()">
        <i class="bi bi-arrow-repeat"></i> Refresh Page
      </button>
    </div>
  `;
}

// Initialize all features on page load
document.addEventListener('DOMContentLoaded', function() {
  // Initialize error handling first
  initializeGlobalErrorHandler();
  initializeNetworkMonitoring();
  
  initializeTheme();
  initializeScrollAnimations();
  loadDashboardData();
  initializeDateInputs();
  
  // Initialize advanced search
  advancedSearch = new AdvancedSearch();
  
  // Initialize charts and notifications
  setTimeout(() => {
    initializeCharts();
    setupNotificationSystem();
  }, 1000);
  
  // Add loading animation to cards
  setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('visible');
      }, index * 100);
    });
  }, 100);
});