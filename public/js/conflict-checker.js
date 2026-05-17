// Real-time Appointment Conflict Checking System

class ConflictChecker {
  constructor() {
    this.cache = new Map();
    this.debounceTimer = null;
  }

  // Real-time conflict checking with debouncing
  async checkConflicts(doctorId, date, time, duration = 30, excludeId = null) {
    return new Promise((resolve) => {
      clearTimeout(this.debounceTimer);
      
      this.debounceTimer = setTimeout(async () => {
        try {
          const cacheKey = `${doctorId}-${date}`;
          
          // Check cache first
          if (!this.cache.has(cacheKey)) {
            await this.loadDoctorSchedule(doctorId, date);
          }
          
          const conflicts = this.findTimeConflicts(doctorId, date, time, duration, excludeId);
          resolve(conflicts);
        } catch (error) {
          console.error('Conflict check error:', error);
          resolve({ hasConflict: false, conflicts: [] });
        }
      }, 300); // 300ms debounce
    });
  }

  // Load and cache doctor's schedule for a specific date
  async loadDoctorSchedule(doctorId, date) {
    try {
      const response = await fetch(`/api/appointments?doctor_id=${doctorId}&date=${date}`);
      const appointments = await response.json();
      
      const cacheKey = `${doctorId}-${date}`;
      this.cache.set(cacheKey, appointments);
      
      // Auto-expire cache after 5 minutes
      setTimeout(() => {
        this.cache.delete(cacheKey);
      }, 5 * 60 * 1000);
      
      return appointments;
    } catch (error) {
      console.error('Error loading doctor schedule:', error);
      return [];
    }
  }

  // Find conflicts with existing appointments
  findTimeConflicts(doctorId, date, requestedTime, duration, excludeId) {
    const cacheKey = `${doctorId}-${date}`;
    const appointments = this.cache.get(cacheKey) || [];
    
    const requestedStart = this.parseTime(requestedTime);
    const requestedEnd = this.addMinutes(requestedStart, duration);
    
    const conflicts = appointments.filter(apt => {
      if (excludeId && apt.id === excludeId) return false;
      if (apt.status === 'cancelled') return false;
      
      const aptStart = this.parseTime(apt.appointment_time);
      const aptEnd = this.addMinutes(aptStart, apt.duration_minutes || 30);
      
      // Check for overlap
      return !(requestedEnd <= aptStart || requestedStart >= aptEnd);
    });
    
    return {
      hasConflict: conflicts.length > 0,
      conflicts: conflicts,
      suggestions: this.getSuggestions(doctorId, date, requestedTime, duration)
    };
  }

  // Get alternative time suggestions
  getSuggestions(doctorId, date, requestedTime, duration) {
    const cacheKey = `${doctorId}-${date}`;
    const appointments = this.cache.get(cacheKey) || [];
    
    const suggestions = [];
    const startHour = 9;
    const endHour = 17;
    
    // Generate 30-minute slots from 9 AM to 5 PM
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        const slotStart = this.parseTime(timeStr);
        const slotEnd = this.addMinutes(slotStart, duration);
        
        // Check if this slot is available
        const isAvailable = !appointments.some(apt => {
          if (apt.status === 'cancelled') return false;
          
          const aptStart = this.parseTime(apt.appointment_time);
          const aptEnd = this.addMinutes(aptStart, apt.duration_minutes || 30);
          
          return !(slotEnd <= aptStart || slotStart >= aptEnd);
        });
        
        if (isAvailable && suggestions.length < 5) {
          suggestions.push({
            time: timeStr,
            displayTime: this.formatDisplayTime(timeStr)
          });
        }
      }
    }
    
    return suggestions;
  }

  // Utility functions
  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(num => parseInt(num));
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  }

  formatDisplayTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  // Clear cache for a specific doctor and date
  clearCache(doctorId = null, date = null) {
    if (doctorId && date) {
      const cacheKey = `${doctorId}-${date}`;
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }

  // Visual conflict indicator
  showConflictIndicator(element, hasConflict, message = '') {
    element.classList.remove('border-success', 'border-danger', 'border-warning');
    
    if (hasConflict) {
      element.classList.add('border-danger');
      this.showTooltip(element, message || 'Time slot not available', 'danger');
    } else {
      element.classList.add('border-success');
      this.showTooltip(element, 'Time slot available', 'success');
    }
  }

  // Show conflict suggestions
  displaySuggestions(suggestions, containerId) {
    const container = document.getElementById(containerId);
    if (!container || suggestions.length === 0) return;
    
    container.innerHTML = `
      <div class=\"alert alert-info\">
        <h6><i class=\"bi bi-lightbulb\"></i> Suggested Available Times:</h6>
        <div class=\"d-flex flex-wrap gap-2 mt-2\">
          ${suggestions.map(suggestion => `
            <button class=\"btn btn-outline-primary btn-sm\" 
                    onclick=\"selectSuggestedTime('${suggestion.time}')\">
              ${suggestion.displayTime}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Tooltip functionality
  showTooltip(element, message, type) {
    const existingTooltip = element.parentElement.querySelector('.conflict-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
    const tooltip = document.createElement('div');
    tooltip.className = `conflict-tooltip alert alert-${type} mt-2 py-1 px-2 small`;
    tooltip.innerHTML = `<i class=\"bi bi-info-circle\"></i> ${message}`;
    
    element.parentElement.appendChild(tooltip);
    
    setTimeout(() => {
      if (tooltip.parentElement) {
        tooltip.remove();
      }
    }, 5000);
  }
}

// Global conflict checker instance
const conflictChecker = new ConflictChecker();

// Enhanced appointment time selection with real-time conflict checking
function setupConflictChecking() {
  const doctorSelect = document.getElementById('doctorSelect');
  const dateInput = document.getElementById('appointmentDate');
  const timeInput = document.getElementById('appointmentTime');
  
  if (!doctorSelect || !dateInput || !timeInput) return;
  
  // Real-time conflict checking on input change
  async function checkAndDisplayConflicts() {
    const doctorId = doctorSelect.value;
    const date = dateInput.value;
    const time = timeInput.value;
    
    if (!doctorId || !date || !time) {
      timeInput.classList.remove('border-success', 'border-danger');
      return;
    }
    
    // Show loading state
    timeInput.classList.add('loading');
    
    try {
      const result = await conflictChecker.checkConflicts(doctorId, date, time);
      
      if (result.hasConflict) {
        conflictChecker.showConflictIndicator(
          timeInput, 
          true, 
          `Conflicts with ${result.conflicts.length} existing appointment(s)`
        );
        
        // Show suggestions
        conflictChecker.displaySuggestions(result.suggestions, 'conflict-suggestions');
      } else {
        conflictChecker.showConflictIndicator(timeInput, false);
        document.getElementById('conflict-suggestions').innerHTML = '';
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      timeInput.classList.remove('loading');
    }
  }
  
  // Attach event listeners
  timeInput.addEventListener('change', checkAndDisplayConflicts);
  dateInput.addEventListener('change', () => {
    conflictChecker.clearCache(doctorSelect.value, dateInput.value);
    checkAndDisplayConflicts();
  });
  doctorSelect.addEventListener('change', () => {
    conflictChecker.clearCache();
    checkAndDisplayConflicts();
  });
}

// Select suggested time
function selectSuggestedTime(time) {
  const timeInput = document.getElementById('appointmentTime');
  if (timeInput) {
    timeInput.value = time;
    timeInput.dispatchEvent(new Event('change'));
  }
}

// Initialize conflict checking when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(setupConflictChecking, 1000); // Wait for other scripts to load
});