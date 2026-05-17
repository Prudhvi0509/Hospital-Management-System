// Patient Management Functions

// Load all patients with enhanced error handling
async function loadPatients() {
  const tbody = document.getElementById('patients-list');
  
  // Show loading state
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="bi bi-hourglass-split"></i> Loading patients...</td></tr>';
  }
  
  try {
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network and try again.');
    }
    
    const res = await fetch('/api/patients');
    
    if (!res.ok) {
      throw new Error(`Failed to load patients: ${res.statusText} (${res.status})`);
    }
    
    patients = await res.json();
    
    if (!Array.isArray(patients)) {
      throw new Error('Invalid data format received from server');
    }
    
    if (tbody) {
      tbody.innerHTML = '';
      
      if (patients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No patients found</td></tr>';
        return;
      }
      
      patients.forEach((patient, index) => {
        try {
          const createdDate = patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'N/A';
          tbody.innerHTML += `
            <tr>
              <td>${patient.id || 'N/A'}</td>
              <td>${patient.full_name || 'Unknown'}</td>
              <td>${patient.phone || 'N/A'}</td>
              <td>${patient.email || 'N/A'}</td>
              <td>${createdDate}</td>
              <td>
                <button class="btn btn-sm btn-danger" onclick="deletePatient(${patient.id})" 
                        ${!patient.id ? 'disabled' : ''}>Delete</button>
              </td>
            </tr>
          `;
        } catch (error) {
          console.error(`Error displaying patient ${index}:`, error, patient);
          tbody.innerHTML += `
            <tr>
              <td colspan="6" class="text-center text-warning">
                <i class="bi bi-exclamation-triangle"></i> Error displaying patient #${index + 1}
              </td>
            </tr>
          `;
        }
      });
    }
  } catch (err) {
    console.error('Error loading patients:', err);
    
    const errorMessage = err.message.includes('Failed to fetch') 
      ? 'Unable to connect to server. Please check your internet connection.'
      : err.message || 'Failed to load patients. Please try again.';
    
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger">
            <i class="bi bi-exclamation-triangle"></i> ${errorMessage}
            <br><button class="btn btn-outline-primary btn-sm mt-2" onclick="loadPatients()">
              <i class="bi bi-arrow-clockwise"></i> Retry
            </button>
          </td>
        </tr>
      `;
    }
    
    showMessage('patient-message', errorMessage, 'danger', err);
  }
}

// Search patient by phone with enhanced validation and error handling
async function searchPatient() {
  const phoneInput = document.getElementById('patientPhone');
  const phone = phoneInput?.value?.trim();
  
  if (!phone) {
    showMessage('booking-message', 'Please enter a phone number to search', 'warning');
    return;
  }
  
  // Basic phone validation
  if (!/^[\d\s\-\(\)\+]+$/.test(phone)) {
    showMessage('booking-message', 'Please enter a valid phone number', 'warning');
    return;
  }
  
  // Show loading state
  if (phoneInput) {
    phoneInput.disabled = true;
    phoneInput.style.cursor = 'wait';
  }

  try {
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network.');
    }
    
    const res = await fetch(`/api/patients/check/phone/${encodeURIComponent(phone)}`);
    
    if (!res.ok) {
      throw new Error(`Failed to search patient: ${res.statusText}`);
    }
    
    const result = await res.json();
    
    const nameField = document.getElementById('patientName');
    const emailField = document.getElementById('patientEmail');
    
    if (result.exists && result.patient) {
      if (nameField) nameField.value = result.patient.full_name || '';
      if (emailField) emailField.value = result.patient.email || '';
      currentPatientId = result.patient.id;
      showMessage('booking-message', 'Existing patient found!', 'success');
    } else {
      if (nameField) nameField.value = '';
      if (emailField) emailField.value = '';
      currentPatientId = null;
      showMessage('booking-message', 'New patient - please enter details', 'info');
    }
  } catch (err) {
    console.error('Error searching patient:', err);
    
    const errorMessage = err.message.includes('Failed to fetch')
      ? 'Network error while searching. Please check your connection.'
      : err.message || 'Failed to search patient. Please try again.';
    
    showMessage('booking-message', errorMessage, 'danger', err);
  } finally {
    // Restore input state
    if (phoneInput) {
      phoneInput.disabled = false;
      phoneInput.style.cursor = 'text';
    }
  }
}

// Search patients by name
async function searchPatients() {
  const searchTerm = document.getElementById('patientSearch').value.trim();
  if (!searchTerm) {
    loadPatients();
    return;
  }

  try {
    const res = await fetch(`/api/patients?search=${searchTerm}`);
    const patients = await res.json();
    
    const tbody = document.getElementById('patients-list');
    if (tbody) {
      tbody.innerHTML = '';
      patients.forEach(patient => {
        tbody.innerHTML += `
          <tr>
            <td>${patient.id}</td>
            <td>${patient.full_name}</td>
            <td>${patient.phone}</td>
            <td>${patient.email || 'N/A'}</td>
            <td>${new Date(patient.created_at).toLocaleDateString()}</td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="deletePatient(${patient.id})">Delete</button>
            </td>
          </tr>
        `;
      });
    }
  } catch (err) {
    console.error('Error searching patients:', err);
  }
}

// Delete patient with enhanced confirmation and error handling
async function deletePatient(id) {
  // Validate input
  if (!id) {
    showMessage('patient-message', 'Invalid patient ID', 'danger');
    return;
  }
  
  // Enhanced confirmation dialog
  const confirmed = confirm(
    'Are you sure you want to delete this patient?\n\n' +
    'This action cannot be undone and will also delete all associated appointments.'
  );
  
  if (!confirmed) return;
  
  // Show loading state
  const deleteButton = event?.target;
  const originalText = deleteButton?.innerHTML;
  if (deleteButton) {
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Deleting...';
  }
  
  try {
    const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
    const result = await res.json();
    
    if (res.ok) {
      loadPatients();
      showMessage('patient-message', result.message || 'Patient deleted successfully', 'success');
    } else {
      throw new Error(result.message || 'Failed to delete patient');
    }
  } catch (err) {
    console.error('Error deleting patient:', err);
    
    const errorMessage = err.message.includes('Failed to fetch')
      ? 'Network error. Please check your connection and try again.'
      : err.message || 'Failed to delete patient. Please try again.';
    
    showMessage('patient-message', errorMessage, 'danger', err);
  } finally {
    // Restore button state
    if (deleteButton && originalText) {
      deleteButton.disabled = false;
      deleteButton.innerHTML = originalText;
    }
  }
}

// Enhanced patient form submission with validation
document.addEventListener('DOMContentLoaded', function() {
  const patientForm = document.getElementById('patientForm');
  if (patientForm) {
    patientForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Clear previous messages
      const messageContainer = document.getElementById('patient-message');
      if (messageContainer) {
        messageContainer.innerHTML = '';
      }
      
      // Get and validate form data
      const formData = {
        name: document.getElementById('newPatientName')?.value?.trim(),
        phone: document.getElementById('newPatientPhone')?.value?.trim(),
        email: document.getElementById('newPatientEmail')?.value?.trim()
      };
      
      // Enhanced validation with sanitization
      const validationErrors = [];
      
      // Sanitize and validate name
      if (!formData.name) {
        validationErrors.push('Patient name is required');
      } else {
        // Basic sanitization - remove HTML tags
        const sanitizedName = formData.name.replace(/<[^>]*>/g, '').trim();
        if (sanitizedName.length < 2) {
          validationErrors.push('Patient name must be at least 2 characters');
        } else if (sanitizedName.length > 100) {
          validationErrors.push('Patient name cannot exceed 100 characters');
        } else if (!/^[a-zA-Z\s\-'".]+$/.test(sanitizedName)) {
          validationErrors.push('Patient name contains invalid characters');
        }
        formData.name = sanitizedName;
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
        showMessage('patient-message', validationErrors.join('<br>'), 'danger');
        return;
      }
      
      // Show loading state
      const submitButton = e.target.querySelector('button[type="submit"]');
      const originalButtonText = submitButton?.innerHTML;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Registering...';
      }
      
      try {
        const res = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            full_name: formData.name, 
            phone: formData.phone, 
            email: formData.email 
          })
        });
        
        const result = await res.json();
        
        if (res.ok) {
          showMessage('patient-message', result.message || 'Patient registered successfully!', 'success');
          patientForm.reset();
          loadPatients();
        } else {
          throw new Error(result.message || 'Failed to register patient');
        }
      } catch (err) {
        console.error('Error registering patient:', err);
        
        const errorMessage = err.message.includes('Failed to fetch')
          ? 'Network error. Please check your connection and try again.'
          : err.message || 'Failed to register patient. Please try again.';
        
        showMessage('patient-message', errorMessage, 'danger', err);
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