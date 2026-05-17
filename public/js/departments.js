// Department Management Functions

// Load departments for appointment booking with enhanced error handling
async function loadDepartments() {
  const select = document.getElementById('departmentSelect');
  
  if (!select) {
    console.error('Department select element not found');
    return;
  }
  
  // Show loading state
  select.innerHTML = '<option value="">Loading departments...</option>';
  select.disabled = true;
  
  try {
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network.');
    }
    
    const res = await fetch('/api/departments');
    
    if (!res.ok) {
      throw new Error(`Failed to load departments: ${res.statusText}`);
    }
    
    departments = await res.json();
    
    if (!Array.isArray(departments)) {
      throw new Error('Invalid data format received from server');
    }
    
    select.innerHTML = '<option value="">Select Department</option>';
    
    if (departments.length === 0) {
      select.innerHTML = '<option value="">No departments available</option>';
    } else {
      departments.forEach(dept => {
        select.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
      });
    }
  } catch (err) {
    console.error('Error loading departments:', err);
    
    const errorMessage = err.message.includes('Failed to fetch')
      ? 'Network error loading departments'
      : 'Failed to load departments';
    
    select.innerHTML = `<option value="">${errorMessage}</option>`;
    showMessage('booking-message', errorMessage, 'warning', err);
  } finally {
    select.disabled = false;
  }
}

// Load departments for doctor registration
async function loadDepartmentsForDoctors() {
  try {
    const res = await fetch('/api/departments');
    const departments = await res.json();
    
    const select = document.getElementById('newDoctorDepartment');
    if (select) {
      select.innerHTML = '<option value="">Select Department</option>';
      departments.forEach(dept => {
        select.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
      });
    }
  } catch (err) {
    console.error('Error loading departments:', err);
  }
}

// Load departments for admin management with enhanced error handling
async function loadDepartmentsAdmin() {
  const tbody = document.getElementById('departments-list');
  
  // Show loading state
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center"><i class="bi bi-hourglass-split"></i> Loading departments...</td></tr>';
  }
  
  try {
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network and try again.');
    }
    
    const res = await fetch('/api/departments');
    
    if (!res.ok) {
      throw new Error(`Failed to load departments: ${res.statusText} (${res.status})`);
    }
    
    const departments = await res.json();
    
    if (!Array.isArray(departments)) {
      throw new Error('Invalid data format received from server');
    }
    
    if (tbody) {
      tbody.innerHTML = '';
      
      if (departments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No departments found</td></tr>';
        return;
      }
      
      departments.forEach((dept, index) => {
        try {
          tbody.innerHTML += `
            <tr>
              <td>${dept.id || 'N/A'}</td>
              <td>${dept.name || 'Unknown'}</td>
              <td>
                <button class="btn btn-sm btn-danger" onclick="deleteDepartment(${dept.id})" 
                        ${!dept.id ? 'disabled' : ''}>Delete</button>
              </td>
            </tr>
          `;
        } catch (error) {
          console.error(`Error displaying department ${index}:`, error, dept);
          tbody.innerHTML += `
            <tr>
              <td colspan="3" class="text-center text-warning">
                <i class="bi bi-exclamation-triangle"></i> Error displaying department #${index + 1}
              </td>
            </tr>
          `;
        }
      });
    }
  } catch (err) {
    console.error('Error loading departments:', err);
    
    const errorMessage = err.message.includes('Failed to fetch') 
      ? 'Unable to connect to server. Please check your internet connection.'
      : err.message || 'Failed to load departments. Please try again.';
    
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-danger">
            <i class="bi bi-exclamation-triangle"></i> ${errorMessage}
            <br><button class="btn btn-outline-primary btn-sm mt-2" onclick="loadDepartmentsAdmin()">
              <i class="bi bi-arrow-clockwise"></i> Retry
            </button>
          </td>
        </tr>
      `;
    }
    
    showMessage('department-message', errorMessage, 'danger', err);
  }
}

// Delete department
async function deleteDepartment(id) {
  if (!confirm('Are you sure you want to delete this department?')) return;
  
  try {
    const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
    const result = await res.json();
    
    if (res.ok) {
      loadDepartmentsAdmin();
      showMessage('department-message', result.message, 'success');
    } else {
      showMessage('department-message', result.message, 'danger');
    }
  } catch (err) {
    console.error('Error deleting department:', err);
    showMessage('department-message', 'Network error', 'danger');
  }
}

// Enhanced department form submission with validation
document.addEventListener('DOMContentLoaded', function() {
  const departmentForm = document.getElementById('departmentForm');
  if (departmentForm) {
    departmentForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Clear previous messages
      const messageContainer = document.getElementById('department-message');
      if (messageContainer) {
        messageContainer.innerHTML = '';
      }
      
      // Get and validate form data with sanitization
      let name = document.getElementById('newDepartmentName')?.value;
      
      // Enhanced validation with sanitization
      if (!name) {
        showMessage('department-message', 'Department name is required', 'danger');
        return;
      }
      
      // Basic sanitization - remove HTML tags
      name = name.replace(/<[^>]*>/g, '').trim();
      
      if (name.length < 2) {
        showMessage('department-message', 'Department name must be at least 2 characters', 'danger');
        return;
      }
      
      if (name.length > 100) {
        showMessage('department-message', 'Department name cannot exceed 100 characters', 'danger');
        return;
      }
      
      // Validate characters
      if (!/^[a-zA-Z\s\-&'".]+$/.test(name)) {
        showMessage('department-message', 'Department name contains invalid characters. Only letters, spaces, hyphens, ampersands, apostrophes, quotes, and periods are allowed.', 'danger');
        return;
      }
      
      // Show loading state
      const submitButton = e.target.querySelector('button[type="submit"]');
      const originalButtonText = submitButton?.innerHTML;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Adding Department...';
      }
      
      try {
        const res = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name })
        });
        
        const result = await res.json();
        
        if (res.ok) {
          showMessage('department-message', result.message || 'Department added successfully!', 'success');
          departmentForm.reset();
          loadDepartmentsAdmin();
          // Also refresh other department selects
          loadDepartments();
          loadDepartmentsForDoctors();
        } else {
          throw new Error(result.message || 'Failed to add department');
        }
      } catch (err) {
        console.error('Error adding department:', err);
        
        const errorMessage = err.message.includes('Failed to fetch')
          ? 'Network error. Please check your connection and try again.'
          : err.message || 'Failed to add department. Please try again.';
        
        showMessage('department-message', errorMessage, 'danger', err);
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