// Interactive Appointment Calendar with Drag & Drop

class AppointmentCalendar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentDate = new Date();
    this.view = 'month'; // 'day', 'week', 'month'
    this.appointments = [];
    this.doctors = [];
    this.draggedAppointment = null;
    
    this.init();
  }

  init() {
    this.createCalendarHeader();
    this.createCalendarBody();
    this.loadData();
    this.attachEventListeners();
  }

  createCalendarHeader() {
    const header = document.createElement('div');
    header.className = 'calendar-header d-flex justify-content-between align-items-center mb-4';
    
    header.innerHTML = `
      <div class=\"calendar-nav\">
        <button class=\"btn btn-outline-primary me-2\" onclick=\"calendar.navigate(-1)\">
          <i class=\"bi bi-chevron-left\"></i>
        </button>
        <h4 class=\"mb-0 me-2\">${this.getHeaderText()}</h4>
        <button class=\"btn btn-outline-primary\" onclick=\"calendar.navigate(1)\">
          <i class=\"bi bi-chevron-right\"></i>
        </button>
      </div>
      
      <div class=\"calendar-controls\">
        <div class=\"btn-group me-3\" role=\"group\">
          <button class=\"btn btn-outline-secondary ${this.view === 'day' ? 'active' : ''}\" 
                  onclick=\"calendar.setView('day')\">Day</button>
          <button class=\"btn btn-outline-secondary ${this.view === 'week' ? 'active' : ''}\" 
                  onclick=\"calendar.setView('week')\">Week</button>
          <button class=\"btn btn-outline-secondary ${this.view === 'month' ? 'active' : ''}\" 
                  onclick=\"calendar.setView('month')\">Month</button>
        </div>
        
        <button class=\"btn btn-primary\" onclick=\"calendar.goToToday()\">
          <i class=\"bi bi-calendar-today\"></i> Today
        </button>
      </div>
    `;
    
    this.container.appendChild(header);
  }

  createCalendarBody() {
    const body = document.createElement('div');
    body.className = 'calendar-body';
    body.id = 'calendar-body';
    
    this.container.appendChild(body);
    this.renderCalendar();
  }

  renderCalendar() {
    const body = document.getElementById('calendar-body');
    body.innerHTML = '';
    
    switch (this.view) {
      case 'day':
        this.renderDayView(body);
        break;
      case 'week':
        this.renderWeekView(body);
        break;
      case 'month':
        this.renderMonthView(body);
        break;
    }
  }

  renderDayView(container) {
    const dayContainer = document.createElement('div');
    dayContainer.className = 'day-view';
    
    // Time slots from 8 AM to 8 PM
    const startHour = 8;
    const endHour = 20;
    
    dayContainer.innerHTML = `
      <div class=\"day-header text-center p-3 bg-light rounded mb-3\">
        <h5>${this.formatDate(this.currentDate)}</h5>
        <small class=\"text-muted\">${this.currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</small>
      </div>
      
      <div class=\"time-slots\">
        ${this.generateTimeSlots(startHour, endHour)}
      </div>
    `;
    
    container.appendChild(dayContainer);
    this.renderAppointmentsInDay();
  }

  renderWeekView(container) {
    const weekContainer = document.createElement('div');
    weekContainer.className = 'week-view';
    
    const weekStart = this.getWeekStart(this.currentDate);
    const weekDays = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      weekDays.push(day);
    }
    
    weekContainer.innerHTML = `
      <div class=\"week-header d-flex\">
        <div class=\"time-column\" style=\"width: 80px;\"></div>
        ${weekDays.map(day => `
          <div class=\"day-column flex-fill text-center p-2 border\">
            <div class=\"fw-bold\">${day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div class=\"text-muted\">${day.getDate()}</div>
          </div>
        `).join('')}
      </div>
      
      <div class=\"week-body\">
        ${this.generateWeekTimeSlots(weekDays)}
      </div>
    `;
    
    container.appendChild(weekContainer);
    this.renderAppointmentsInWeek(weekDays);
  }

  renderMonthView(container) {
    const monthContainer = document.createElement('div');
    monthContainer.className = 'month-view';
    
    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    const startDate = this.getWeekStart(firstDay);
    
    const weeks = [];
    let currentWeek = [];
    let currentDate = new Date(startDate);
    
    // Generate 6 weeks to cover the month
    for (let week = 0; week < 6; week++) {
      currentWeek = [];
      for (let day = 0; day < 7; day++) {
        currentWeek.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(currentWeek);
    }
    
    monthContainer.innerHTML = `
      <div class=\"month-header d-flex\">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `
          <div class=\"day-header flex-fill text-center p-2 fw-bold bg-light\">${day}</div>
        `).join('')}
      </div>
      
      <div class=\"month-body\">
        ${weeks.map(week => `
          <div class=\"week-row d-flex\">
            ${week.map(day => `
              <div class=\"day-cell flex-fill border position-relative\" 
                   style=\"min-height: 120px; cursor: pointer;\"
                   data-date=\"${day.toISOString().split('T')[0]}\"
                   onclick=\"calendar.selectDate('${day.toISOString().split('T')[0]}')\">
                <div class=\"day-number p-2 ${
                  day.getMonth() !== this.currentDate.getMonth() ? 'text-muted' : ''
                } ${
                  day.toDateString() === new Date().toDateString() ? 'bg-primary text-white rounded-circle d-inline-block' : ''
                }\" style=\"width: 30px; height: 30px; line-height: 20px; text-align: center;\">
                  ${day.getDate()}
                </div>
                <div class=\"day-appointments\" id=\"day-${day.toISOString().split('T')[0]}\">
                  <!-- Appointments will be rendered here -->
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;
    
    container.appendChild(monthContainer);
    this.renderAppointmentsInMonth();
  }

  generateTimeSlots(startHour, endHour) {
    let slots = '';
    
    for (let hour = startHour; hour <= endHour; hour++) {
      slots += `
        <div class=\"time-slot d-flex border-bottom\" 
             data-time=\"${hour.toString().padStart(2, '0')}:00\"
             ondrop=\"calendar.handleDrop(event)\"
             ondragover=\"calendar.handleDragOver(event)\">
          <div class=\"time-label\" style=\"width: 80px; padding: 10px; background: #f8f9fa;\">
            ${this.formatTime(hour)}
          </div>
          <div class=\"slot-content flex-fill p-2 position-relative\" 
               style=\"min-height: 60px;\"
               id=\"slot-${hour}\">
            <!-- Appointments will be rendered here -->
          </div>
        </div>
      `;
    }
    
    return slots;
  }

  generateWeekTimeSlots(weekDays) {
    let slots = '';
    
    for (let hour = 8; hour <= 20; hour++) {
      slots += `
        <div class=\"time-row d-flex border-bottom\">
          <div class=\"time-label\" style=\"width: 80px; padding: 10px; background: #f8f9fa;\">
            ${this.formatTime(hour)}
          </div>
          ${weekDays.map(day => `
            <div class=\"day-slot flex-fill border-start p-1 position-relative\" 
                 style=\"min-height: 60px;\"
                 data-date=\"${day.toISOString().split('T')[0]}\"
                 data-time=\"${hour.toString().padStart(2, '0')}:00\"
                 ondrop=\"calendar.handleDrop(event)\"
                 ondragover=\"calendar.handleDragOver(event)\"
                 id=\"slot-${day.toISOString().split('T')[0]}-${hour}\">
              <!-- Appointments will be rendered here -->
            </div>
          `).join('')}
        </div>
      `;
    }
    
    return slots;
  }

  renderAppointmentsInDay() {
    const dayStr = this.currentDate.toISOString().split('T')[0];
    const dayAppointments = this.appointments.filter(apt => 
      apt.appointment_date.split('T')[0] === dayStr
    );
    
    dayAppointments.forEach(appointment => {
      const hour = parseInt(appointment.appointment_time.split(':')[0]);
      const slotElement = document.getElementById(`slot-${hour}`);
      
      if (slotElement) {
        const appointmentElement = this.createAppointmentElement(appointment);
        slotElement.appendChild(appointmentElement);
      }
    });
  }

  renderAppointmentsInWeek(weekDays) {
    weekDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      const dayAppointments = this.appointments.filter(apt => 
        apt.appointment_date.split('T')[0] === dayStr
      );
      
      dayAppointments.forEach(appointment => {
        const hour = parseInt(appointment.appointment_time.split(':')[0]);
        const slotElement = document.getElementById(`slot-${dayStr}-${hour}`);
        
        if (slotElement) {
          const appointmentElement = this.createAppointmentElement(appointment, true);
          slotElement.appendChild(appointmentElement);
        }
      });
    });
  }

  renderAppointmentsInMonth() {
    // Group appointments by date
    const appointmentsByDate = {};
    this.appointments.forEach(apt => {
      const dateStr = apt.appointment_date.split('T')[0];
      if (!appointmentsByDate[dateStr]) {
        appointmentsByDate[dateStr] = [];
      }
      appointmentsByDate[dateStr].push(apt);
    });
    
    // Render appointments in each day cell
    Object.keys(appointmentsByDate).forEach(dateStr => {
      const dayElement = document.getElementById(`day-${dateStr}`);
      if (dayElement) {
        const appointments = appointmentsByDate[dateStr];
        appointments.slice(0, 3).forEach(appointment => { // Show max 3 appointments
          const appointmentElement = this.createMonthAppointmentElement(appointment);
          dayElement.appendChild(appointmentElement);
        });
        
        if (appointments.length > 3) {
          const moreElement = document.createElement('div');
          moreElement.className = 'text-muted small';
          moreElement.textContent = `+${appointments.length - 3} more`;
          dayElement.appendChild(moreElement);
        }
      }
    });
  }

  createAppointmentElement(appointment, compact = false) {
    const element = document.createElement('div');
    element.className = `appointment-item ${compact ? 'compact' : ''}`;
    element.draggable = true;
    element.dataset.appointmentId = appointment.id;
    
    const statusColor = this.getStatusColor(appointment.status);
    
    element.innerHTML = `
      <div class=\"appointment-content p-2 rounded mb-1\" 
           style=\"background: ${statusColor}; color: white; cursor: move;\">
        <div class=\"fw-bold\">${appointment.patient_name}</div>
        ${!compact ? `<div class=\"small\">Dr. ${appointment.doctor_name}</div>` : ''}
        <div class=\"small\">${appointment.appointment_time.substring(0, 5)}</div>
      </div>
    `;
    
    // Add event listeners
    element.addEventListener('dragstart', (e) => this.handleDragStart(e, appointment));
    element.addEventListener('click', () => this.showAppointmentDetails(appointment));
    
    return element;
  }

  createMonthAppointmentElement(appointment) {
    const element = document.createElement('div');
    element.className = 'month-appointment small mb-1';
    element.draggable = true;
    element.dataset.appointmentId = appointment.id;
    
    const statusColor = this.getStatusColor(appointment.status);
    
    element.innerHTML = `
      <div class=\"p-1 rounded\" style=\"background: ${statusColor}; color: white; font-size: 0.7rem;\">
        ${appointment.appointment_time.substring(0, 5)} - ${appointment.patient_name}
      </div>
    `;
    
    element.addEventListener('dragstart', (e) => this.handleDragStart(e, appointment));
    element.addEventListener('click', () => this.showAppointmentDetails(appointment));
    
    return element;
  }

  // Drag and Drop Handlers
  handleDragStart(e, appointment) {
    this.draggedAppointment = appointment;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.target.classList.add('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');
    
    if (!this.draggedAppointment) return;
    
    const newDate = e.target.dataset.date || this.currentDate.toISOString().split('T')[0];
    const newTime = e.target.dataset.time || '09:00';
    
    this.moveAppointment(this.draggedAppointment.id, newDate, newTime);
    
    // Reset drag state
    this.draggedAppointment = null;
    document.querySelectorAll('.appointment-item').forEach(el => {
      el.style.opacity = '1';
    });
  }

  // Navigation and View Controls
  navigate(direction) {
    switch (this.view) {
      case 'day':
        this.currentDate.setDate(this.currentDate.getDate() + direction);
        break;
      case 'week':
        this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
        break;
      case 'month':
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        break;
    }
    
    this.updateHeader();
    this.renderCalendar();
    this.loadData();
  }

  setView(view) {
    this.view = view;
    document.querySelectorAll('.calendar-controls .btn-group .btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    this.renderCalendar();
    this.loadData();
  }

  goToToday() {
    this.currentDate = new Date();
    this.updateHeader();
    this.renderCalendar();
    this.loadData();
  }

  selectDate(dateStr) {
    this.currentDate = new Date(dateStr);
    this.setView('day');
  }

  updateHeader() {
    const headerText = this.container.querySelector('.calendar-header h4');
    if (headerText) {
      headerText.textContent = this.getHeaderText();
    }
  }

  // Data Loading and Management
  async loadData() {
    try {
      // Load appointments
      const startDate = this.getViewStartDate();
      const endDate = this.getViewEndDate();
      
      const appointmentsResponse = await fetch(`/api/appointments`);
      this.appointments = await appointmentsResponse.json();
      
      // Filter appointments for current view period
      this.appointments = this.appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= startDate && aptDate <= endDate;
      });
      
      // Load doctors
      const doctorsResponse = await fetch('/api/doctors');
      this.doctors = await doctorsResponse.json();
      
      // Re-render appointments
      this.clearAppointments();
      switch (this.view) {
        case 'day':
          this.renderAppointmentsInDay();
          break;
        case 'week':
          this.renderAppointmentsInWeek(this.getWeekDays());
          break;
        case 'month':
          this.renderAppointmentsInMonth();
          break;
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  }

  async moveAppointment(appointmentId, newDate, newTime) {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointment_date: newDate,
          appointment_time: newTime
        })
      });
      
      if (response.ok) {
        showNotification('Appointment moved successfully!', 'success');
        this.loadData(); // Refresh calendar
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to move appointment', 'danger');
      }
    } catch (error) {
      console.error('Error moving appointment:', error);
      showNotification('Network error while moving appointment', 'danger');
    }
  }

  showAppointmentDetails(appointment) {
    // Create modal or popup with appointment details
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class=\"modal-dialog\">
        <div class=\"modal-content\">
          <div class=\"modal-header\">
            <h5 class=\"modal-title\">Appointment Details</h5>
            <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\"></button>
          </div>
          <div class=\"modal-body\">
            <p><strong>Patient:</strong> ${appointment.patient_name}</p>
            <p><strong>Doctor:</strong> Dr. ${appointment.doctor_name}</p>
            <p><strong>Department:</strong> ${appointment.department_name}</p>
            <p><strong>Date:</strong> ${new Date(appointment.appointment_date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${appointment.appointment_time}</p>
            <p><strong>Status:</strong> <span class=\"badge bg-${this.getStatusClass(appointment.status)}\">${appointment.status}</span></p>
            ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
          </div>
          <div class=\"modal-footer\">
            <button type=\"button\" class=\"btn btn-secondary\" data-bs-dismiss=\"modal\">Close</button>
            <button type=\"button\" class=\"btn btn-primary\" onclick=\"editAppointment(${appointment.id})\">Edit</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Remove modal from DOM when hidden
    modal.addEventListener('hidden.bs.modal', () => {
      modal.remove();
    });
  }

  // Utility Methods
  getHeaderText() {
    switch (this.view) {
      case 'day':
        return this.currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'week':
        const weekStart = this.getWeekStart(this.currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'month':
        return this.currentDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
    }
  }

  getWeekStart(date) {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    return start;
  }

  getWeekDays() {
    const weekStart = this.getWeekStart(this.currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }

  getViewStartDate() {
    switch (this.view) {
      case 'day':
        return new Date(this.currentDate);
      case 'week':
        return this.getWeekStart(this.currentDate);
      case 'month':
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        return this.getWeekStart(firstDay);
    }
  }

  getViewEndDate() {
    switch (this.view) {
      case 'day':
        return new Date(this.currentDate);
      case 'week':
        const weekEnd = this.getWeekStart(this.currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return weekEnd;
      case 'month':
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const monthEnd = this.getWeekStart(lastDay);
        monthEnd.setDate(monthEnd.getDate() + 6);
        return monthEnd;
    }
  }

  formatTime(hour) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  }

  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getStatusColor(status) {
    switch (status) {
      case 'scheduled': return '#4f46e5';
      case 'checked_in': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getStatusClass(status) {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'checked_in': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  }

  clearAppointments() {
    document.querySelectorAll('.appointment-item, .month-appointment').forEach(el => {
      el.remove();
    });
  }

  attachEventListeners() {
    // Add global event listeners for drag and drop
    document.addEventListener('dragend', (e) => {
      e.target.style.opacity = '1';
      document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    });
  }
}

// Global calendar instance
let calendar;

// Initialize calendar when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Add calendar to appointments section
  const appointmentsSection = document.getElementById('appointments-section');
  if (appointmentsSection) {
    // Add calendar container
    const calendarRow = document.createElement('div');
    calendarRow.className = 'row mt-4';
    calendarRow.innerHTML = `
      <div class=\"col-12\">
        <div class=\"card\">
          <div class=\"card-header\">
            <h5><i class=\"bi bi-calendar3\"></i> Appointment Calendar</h5>
          </div>
          <div class=\"card-body\">
            <div id=\"appointment-calendar\"></div>
          </div>
        </div>
      </div>
    `;
    
    appointmentsSection.appendChild(calendarRow);
    
    // Initialize calendar
    calendar = new AppointmentCalendar('appointment-calendar');
  }
});