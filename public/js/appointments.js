// Appointment Management Functions

// Load all appointments with enhanced error handling
async function loadAllAppointments() {
  // Show loading indicator
  const tbody = document.getElementById('appointments-list');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="bi bi-hourglass-split"></i> Loading appointments...</td></tr>';
  }
  
  try {
    // Check network connectivity
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network and try again.');
    }
    
    const res = await fetch('/api/appointments');
    
    if (!res.ok) {
      throw new Error(`Failed to load appointments: ${res.statusText} (${res.status})`);
    }
    
    appointments = await res.json();
    
    if (!Array.isArray(appointments)) {
      throw new Error('Invalid data format received from server');
    }
    
    displayAppointments(appointments);
  } catch (err) {
    console.error('Error loading appointments:', err);
    
    const errorMessage = err.message.includes('Failed to fetch') 
      ? 'Unable to connect to server. Please check your internet connection.'
      : err.message || 'Failed to load appointments. Please try again.';
    
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-danger">
            <i class="bi bi-exclamation-triangle"></i> ${errorMessage}
            <br><button class="btn btn-outline-primary btn-sm mt-2" onclick="loadAllAppointments()">
              <i class="bi bi-arrow-clockwise"></i> Retry
            </button>
          </td>
        </tr>
      `;
    }
    
    showMessage('appointment-message', errorMessage, 'danger', err);
  }
}

// Display appointments in table with enhanced error handling
function displayAppointments(appointmentsList) {
  const tbody = document.getElementById('appointments-list');
  if (!tbody) {
    console.error('Appointments table not found');
    return;
  }
  
  tbody.innerHTML = '';
  
  if (!Array.isArray(appointmentsList)) {
    console.error('Invalid appointments data:', appointmentsList);
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Invalid data format</td></tr>';
    return;
  }
  
  if (appointmentsList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No appointments found</td></tr>';
    return;
  }
  
  appointmentsList.forEach((apt, index) => {
    try {
      const date = apt.appointment_date ? new Date(apt.appointment_date).toLocaleDateString() : 'Invalid Date';
      const statusColor = getStatusColor(apt.status || 'unknown');
      
      tbody.innerHTML += `
        <tr>
          <td>${apt.id || 'N/A'}</td>
          <td>${apt.patient_name || 'Unknown Patient'}</td>
          <td>Dr. ${apt.doctor_name || 'Unknown Doctor'}</td>
          <td>${date}</td>
          <td>${apt.appointment_time || 'N/A'}</td>
          <td><span class="badge bg-${statusColor}">${apt.status || 'unknown'}</span></td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="updateAppointmentStatus(${apt.id}, 'checked_in')" 
                      ${!apt.id ? 'disabled' : ''}>Check In</button>
              <button class="btn btn-outline-success" onclick="updateAppointmentStatus(${apt.id}, 'completed')" 
                      ${!apt.id ? 'disabled' : ''}>Complete</button>
              <button class="btn btn-outline-danger" onclick="updateAppointmentStatus(${apt.id}, 'cancelled')" 
                      ${!apt.id ? 'disabled' : ''}>Cancel</button>
            </div>
          </td>
        </tr>
      `;
    } catch (error) {
      console.error(`Error displaying appointment ${index}:`, error, apt);
      tbody.innerHTML += `
        <tr>
          <td colspan="8" class="text-center text-warning">
            <i class="bi bi-exclamation-triangle"></i> Error displaying appointment #${index + 1}
          </td>
        </tr>
      `;
    }
  });
}

// Filter appointments by status
function filterAppointments() {
  const status = document.getElementById('statusFilter').value;
  let filteredAppointments = appointments;
  
  if (status) {
    filteredAppointments = appointments.filter(apt => apt.status === status);
  }
  
  displayAppointments(filteredAppointments);
}

// Update appointment status with enhanced error handling
async function updateAppointmentStatus(appointmentId, newStatus) {
  // Validate inputs
  if (!appointmentId || !newStatus) {
    showMessage('booking-message', 'Invalid appointment data', 'danger');
    return;
  }
  
  // Show loading state
  const button = event?.target;
  const originalText = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.innerHTML = '<i class="bi bi-hourglass-split"></i> Updating...';
  }
  
  try {
    const res = await fetch(`/api/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    const result = await res.json();
    
    if (res.ok) {
      loadAllAppointments(); // Reload appointments
      if (typeof loadDashboardData === 'function') {
        loadDashboardData(); // Update dashboard
      }
      showMessage('booking-message', `Appointment ${newStatus} successfully`, 'success');
    } else {
      throw new Error(result.message || 'Failed to update appointment status');
    }
  } catch (err) {
    console.error('Error updating appointment status:', err);
    
    const errorMessage = err.message.includes('Failed to fetch')
      ? 'Network error. Please check your connection and try again.'
      : err.message || 'Failed to update appointment. Please try again.';
    
    showMessage('booking-message', errorMessage, 'danger', err);
  } finally {
    // Restore button state
    if (button && originalText) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
}

// Enhanced appointment form submission with better validation and error handling
document.addEventListener('DOMContentLoaded', function() {
  const appointmentForm = document.getElementById('appointmentForm');
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Clear previous messages
      const messageContainer = document.getElementById('booking-message');
      if (messageContainer) {
        messageContainer.innerHTML = '';
      }
      
      // Get form data with validation
      const formData = {
        patientPhone: document.getElementById('patientPhone')?.value?.trim(),
        patientName: document.getElementById('patientName')?.value?.trim(),
        patientEmail: document.getElementById('patientEmail')?.value?.trim(),
        doctorId: document.getElementById('doctorSelect')?.value,
        date: document.getElementById('appointmentDate')?.value,
        time: document.getElementById('appointmentTime')?.value,
        notes: document.getElementById('appointmentReason')?.value?.trim()
      };
      
      // Enhanced validation with sanitization
      const validationErrors = [];
      
      // Sanitize and validate phone
      if (!formData.patientPhone) {
        validationErrors.push('Patient phone number is required');
      } else {
        // Basic sanitization
        const sanitizedPhone = formData.patientPhone.replace(/[^\d\s\-\(\)\+]/g, '');
        if (sanitizedPhone.length < 10) {
          validationErrors.push('Phone number must be at least 10 digits');
        } else if (sanitizedPhone.length > 15) {
          validationErrors.push('Phone number cannot exceed 15 digits');
        } else if (!/^\+?[\d\s\-\(\)]+$/.test(sanitizedPhone)) {
          validationErrors.push('Invalid phone number format');
        }
        formData.patientPhone = sanitizedPhone;
      }
      
      // Sanitize and validate name
      if (!formData.patientName) {
        validationErrors.push('Patient name is required');
      } else {
        // Basic sanitization - remove HTML tags
        const sanitizedName = formData.patientName.replace(/<[^>]*>/g, '').trim();
        if (sanitizedName.length < 2) {
          validationErrors.push('Patient name must be at least 2 characters');
        } else if (sanitizedName.length > 100) {
          validationErrors.push('Patient name cannot exceed 100 characters');
        } else if (!/^[a-zA-Z\s\-'".]+$/.test(sanitizedName)) {
          validationErrors.push('Patient name contains invalid characters');
        }
        formData.patientName = sanitizedName;
      }
      
      // Sanitize and validate email
      if (formData.patientEmail) {
        // Basic sanitization
        const sanitizedEmail = formData.patientEmail.replace(/<[^>]*>/g, '').trim();
        if (sanitizedEmail.length > 100) {
          validationErrors.push('Email cannot exceed 100 characters');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
          validationErrors.push('Invalid email format');
        }
        formData.patientEmail = sanitizedEmail;
      }
      
      // Validate other fields
      if (!formData.doctorId) validationErrors.push('Please select a doctor');
      if (!formData.date) validationErrors.push('Please select an appointment date');
      if (!formData.time) validationErrors.push('Please select an appointment time');
      
      // Validate notes
      if (formData.notes) {
        const sanitizedNotes = formData.notes.replace(/<[^>]*>/g, '').trim();
        if (sanitizedNotes.length > 500) {
          validationErrors.push('Notes cannot exceed 500 characters');
        }
        formData.notes = sanitizedNotes;
      }
      
      // Check if date is in the past
      if (formData.date) {
        const selectedDate = new Date(formData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          validationErrors.push('Cannot book appointments in the past');
        }
      }
      
      if (validationErrors.length > 0) {
        showMessage('booking-message', validationErrors.join('<br>'), 'danger');
        return;
      }
      
      // Show loading state
      const submitButton = e.target.querySelector('button[type="submit"]');
      const originalButtonText = submitButton?.innerHTML;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Booking...';
      }

      try {
        let patientId = currentPatientId;
        
        // Create patient if doesn't exist
        if (!patientId) {
          const patientRes = await fetch('/api/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: formData.patientName,
              phone: formData.patientPhone,
              email: formData.patientEmail
            })
          });
          
          if (!patientRes.ok) {
            const error = await patientRes.json();
            throw new Error(error.message || 'Failed to register patient');
          }
          
          const patientResult = await patientRes.json();
          patientId = patientResult.patient.id;
        }
        
        // Create appointment
        const appointmentRes = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: patientId,
            doctor_id: formData.doctorId,
            appointment_date: formData.date,
            appointment_time: formData.time,
            notes: formData.notes
          })
        });
        
        const result = await appointmentRes.json();
        
        if (appointmentRes.ok) {
          showMessage('booking-message', result.message || 'Appointment booked successfully!', 'success');
          appointmentForm.reset();
          currentPatientId = null;
          
          // Clear patient fields
          const patientFields = ['patientName', 'patientEmail'];
          patientFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
          });
          
          // Refresh available slots and dashboard
          if (typeof loadAvailableSlots === 'function') loadAvailableSlots();
          if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
          throw new Error(result.message || 'Failed to book appointment');
        }
      } catch (err) {
        console.error('Error booking appointment:', err);
        
        const errorMessage = err.message.includes('Failed to fetch')
          ? 'Network error. Please check your connection and try again.'
          : err.message || 'Failed to book appointment. Please try again.';
        
        showMessage('booking-message', errorMessage, 'danger', err);
      } finally {
        // Restore button state
        if (submitButton && originalButtonText) {
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonText;
        }
      }
    });
  }
});