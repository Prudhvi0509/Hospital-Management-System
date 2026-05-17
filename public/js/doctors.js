// Doctor Management Functions

// Load doctors by department for appointment booking with enhanced error handling
async function loadDoctorsByDepartment() {
  const departmentSelect = document.getElementById('departmentSelect');
  const doctorSelect = document.getElementById('doctorSelect');
  
  if (!departmentSelect || !doctorSelect) {
    console.error('Required select elements not found');
    return;
  }
  
  const departmentId = departmentSelect.value;
  
  // Reset doctor select
  doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
  
  if (!departmentId) {
    return;
  }
  
  // Show loading state
  doctorSelect.innerHTML = '<option value="">Loading doctors...</option>';
  doctorSelect.disabled = true;

  try {
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network.');
    }
    
    const res = await fetch(`/api/doctors?department_id=${encodeURIComponent(departmentId)}`);
    
    if (!res.ok) {
      throw new Error(`Failed to load doctors: ${res.statusText}`);
    }
    
    const doctors = await res.json();
    
    if (!Array.isArray(doctors)) {
      throw new Error('Invalid data format received from server');
    }
    
    doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
    
    if (doctors.length === 0) {
      doctorSelect.innerHTML = '<option value="">No doctors available in this department</option>';
    } else {
      doctors.forEach(doctor => {
        doctorSelect.innerHTML += `<option value="${doctor.id}">Dr. ${doctor.full_name}</option>`;
      });
    }
  } catch (err) {
    console.error('Error loading doctors:', err);
    
    const errorMessage = err.message.includes('Failed to fetch')
      ? 'Network error loading doctors'
      : 'Failed to load doctors';
    
    doctorSelect.innerHTML = `<option value="">${errorMessage}</option>`;
    showMessage('booking-message', errorMessage, 'warning', err);
  } finally {
    doctorSelect.disabled = false;
  }
}

// Load all doctors for management with enhanced error handling
async function loadAllDoctors() {
  const tbody = document.getElementById('doctors-list');
  
  // Show loading state
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="bi bi-hourglass-split"></i> Loading doctors...</td></tr>';
  }
  
  try {
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network and try again.');
    }
    
    const res = await fetch('/api/doctors');
    
    if (!res.ok) {
      throw new Error(`Failed to load doctors: ${res.statusText} (${res.status})`);
    }
    
    doctors = await res.json();
    
    if (!Array.isArray(doctors)) {
      throw new Error('Invalid data format received from server');
    }
    
    if (tbody) {
      tbody.innerHTML = '';
      
      if (doctors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No doctors found</td></tr>';
        return;
      }
      
      doctors.forEach((doctor, index) => {
        try {
          tbody.innerHTML += `
            <tr>
              <td>${doctor.id || 'N/A'}</td>
              <td>Dr. ${doctor.full_name || 'Unknown'}</td>
              <td>${doctor.department_name || 'N/A'}</td>
              <td>${doctor.phone || 'N/A'}</td>
              <td>${doctor.email || 'N/A'}</td>
              <td>
                <button class="btn btn-sm btn-danger" onclick="deleteDoctor(${doctor.id})" 
                        ${!doctor.id ? 'disabled' : ''}>Delete</button>
              </td>
            </tr>
          `;
        } catch (error) {
          console.error(`Error displaying doctor ${index}:`, error, doctor);
          tbody.innerHTML += `
            <tr>
              <td colspan="6" class="text-center text-warning">
                <i class="bi bi-exclamation-triangle"></i> Error displaying doctor #${index + 1}
              </td>
            </tr>
          `;
        }
      });
    }
  } catch (err) {
    console.error('Error loading doctors:', err);
    
    const errorMessage = err.message.includes('Failed to fetch') 
      ? 'Unable to connect to server. Please check your internet connection.'
      : err.message || 'Failed to load doctors. Please try again.';
    
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger">
            <i class="bi bi-exclamation-triangle"></i> ${errorMessage}
            <br><button class="btn btn-outline-primary btn-sm mt-2" onclick="loadAllDoctors()">
              <i class="bi bi-arrow-clockwise"></i> Retry
            </button>
          </td>
        </tr>
      `;
    }
    
    showMessage('doctor-message', errorMessage, 'danger', err);
  }
}

// Load available slots for a doctor with enhanced error handling
async function loadAvailableSlots() {
  const doctorSelect = document.getElementById('doctorSelect');
  const dateInput = document.getElementById('appointmentDate');
  const slotsContainer = document.getElementById('available-slots');
  const timeSelect = document.getElementById('appointmentTime');
  
  const doctorId = doctorSelect?.value;
  const date = dateInput?.value;
  
  // Reset containers
  if (slotsContainer) {
    slotsContainer.innerHTML = 'Select doctor and date to see available slots';
  }
  if (timeSelect) {
    timeSelect.innerHTML = '<option value="">Select Time</option>';
  }
  
  if (!doctorId || !date) {
    return;
  }
  
  // Show loading state
  if (slotsContainer) {
    slotsContainer.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading available slots...';
  }

  try {
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network.');
    }
    
    const res = await fetch(`/api/doctors/${encodeURIComponent(doctorId)}/available-slots/${encodeURIComponent(date)}`);
    
    if (!res.ok) {
      throw new Error(`Failed to load slots: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    if (!data.slots || !Array.isArray(data.slots)) {
      throw new Error('Invalid slots data received from server');
    }
    
    if (timeSelect) {
      timeSelect.innerHTML = '<option value="">Select Time</option>';
    }
    
    let slotsHtml = '<div class="row">';
    let availableCount = 0;
    
    data.slots.forEach(slot => {
      const badgeClass = slot.available ? 'bg-success' : 'bg-danger';
      const status = slot.available ? 'Available' : 'Booked';
      
      if (slot.available) {
        availableCount++;
        if (timeSelect) {
          timeSelect.innerHTML += `<option value="${slot.time}">${slot.time}</option>`;
        }
      }
      
      slotsHtml += `
        <div class="col-6 col-md-4 mb-2">
          <span class="badge ${badgeClass} w-100">${slot.time} - ${status}</span>
        </div>
      `;
    });
    slotsHtml += '</div>';
    
    if (availableCount === 0) {
      slotsHtml += '<div class="alert alert-warning mt-2"><i class="bi bi-exclamation-triangle"></i> No available slots for this date. Please select a different date.</div>';
    }
    
    if (slotsContainer) {
      slotsContainer.innerHTML = slotsHtml;
    }
  } catch (err) {
    console.error('Error loading available slots:', err);
    
    const errorMessage = err.message.includes('Failed to fetch')
      ? 'Network error loading slots'
      : err.message || 'Failed to load available slots';
    
    if (slotsContainer) {
      slotsContainer.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle"></i> ${errorMessage}
          <button class="btn btn-outline-danger btn-sm ms-2" onclick="loadAvailableSlots()">
            <i class="bi bi-arrow-clockwise"></i> Retry
          </button>
        </div>
      `;
    }
    
    showMessage('booking-message', errorMessage, 'warning', err);
  }
}

// Delete doctor
async function deleteDoctor(id) {
  if (!confirm('Are you sure you want to delete this doctor?')) return;
  
  try {
    const res = await fetch(`/api/doctors/${id}`, { method: 'DELETE' });
    const result = await res.json();
    
    if (res.ok) {
      loadAllDoctors();
      showMessage('doctor-message', result.message, 'success');
    } else {
      showMessage('doctor-message', result.message, 'danger');
    }
  } catch (err) {
    console.error('Error deleting doctor:', err);
    showMessage('doctor-message', 'Network error', 'danger');
  }
}

// Enhanced doctor form submission with validation
document.addEventListener('DOMContentLoaded', function() {
  const doctorForm = document.getElementById('doctorForm');
  if (doctorForm) {
    doctorForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Clear previous messages
      const messageContainer = document.getElementById('doctor-message');
      if (messageContainer) {
        messageContainer.innerHTML = '';
      }
      
      // Get and validate form data
      const formData = {
        name: document.getElementById('newDoctorName')?.value?.trim(),
        departmentId: document.getElementById('newDoctorDepartment')?.value,
        phone: document.getElementById('newDoctorPhone')?.value?.trim(),
        email: document.getElementById('newDoctorEmail')?.value?.trim()
      };
      
      // Enhanced validation with sanitization
      const validationErrors = [];
      
      // Sanitize and validate name
      if (!formData.name) {
        validationErrors.push('Doctor name is required');
      } else {
        // Basic sanitization - remove HTML tags
        const sanitizedName = formData.name.replace(/<[^>]*>/g, '').trim();
        if (sanitizedName.length < 2) {
          validationErrors.push('Doctor name must be at least 2 characters');
        } else if (sanitizedName.length > 100) {
          validationErrors.push('Doctor name cannot exceed 100 characters');
        } else if (!/^[a-zA-Z\s\-'".]+$/.test(sanitizedName)) {
          validationErrors.push('Doctor name contains invalid characters');
        }
        formData.name = sanitizedName;
      }
      
      if (!formData.departmentId) {
        validationErrors.push('Please select a department');
      }
      
      // Sanitize and validate phone
      if (!formData.phone) {
        validationErrors.push('Phone number is required');
      } else {
        // Basic sanitization
        const sanitizedPhone = formData.phone.replace(/[^\d\s\-\(\)\+]/g, '');
        if (sanitizedPhone.length < 10) {
          validationErrors.push('Phone number must be at least 10 digits');
        } else if (sanitizedPhone.length > 15) {
          validationErrors.push('Phone number cannot exceed 15 digits');
        } else if (!/^\+?[\d\s\-\(\)]+$/.test(sanitizedPhone)) {
          validationErrors.push('Invalid phone number format');
        }
        formData.phone = sanitizedPhone;
      }
      
      // Sanitize and validate email
      if (formData.email) {
        // Basic sanitization
        const sanitizedEmail = formData.email.replace(/<[^>]*>/g, '').trim();
        if (sanitizedEmail.length > 100) {
          validationErrors.push('Email cannot exceed 100 characters');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
          validationErrors.push('Invalid email format');
        }
        formData.email = sanitizedEmail;
      }
      
      if (validationErrors.length > 0) {
        showMessage('doctor-message', validationErrors.join('<br>'), 'danger');
        return;
      }
      
      // Show loading state
      const submitButton = e.target.querySelector('button[type="submit"]');
      const originalButtonText = submitButton?.innerHTML;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Adding Doctor...';
      }
      
      try {
        const res = await fetch('/api/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            full_name: formData.name, 
            department_id: formData.departmentId, 
            phone: formData.phone, 
            email: formData.email 
          })
        });
        
        const result = await res.json();
        
        if (res.ok) {
          showMessage('doctor-message', result.message || 'Doctor added successfully!', 'success');
          doctorForm.reset();
          loadAllDoctors();
        } else {
          throw new Error(result.message || 'Failed to add doctor');
        }
      } catch (err) {
        console.error('Error adding doctor:', err);
        
        const errorMessage = err.message.includes('Failed to fetch')
          ? 'Network error. Please check your connection and try again.'
          : err.message || 'Failed to add doctor. Please try again.';
        
        showMessage('doctor-message', errorMessage, 'danger', err);
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