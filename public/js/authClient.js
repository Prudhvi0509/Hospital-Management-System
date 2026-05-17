// Authentication Client Handler
// Handles protected page access and logout

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  const currentPath = window.location.pathname;
  
  // Auth pages that don't require authentication
  const publicPages = ['login.html', 'register.html', 'reset-password.html'];
  const isPublicPage = publicPages.some(page => currentPath.includes(page));

  // Check auth status on protected pages
  if (!isPublicPage) {
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to login if no token
      window.location.href = 'login.html';
      return;
    }
    
    // Optionally verify token with server
    verifyToken(token);
    
    // Display user info if available
    displayUserInfo();
  }

  // Handle logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
});

// Verify token is still valid
async function verifyToken(token) {
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      // Only logout if explicitly told token is invalid (401)
      if (response.status === 401 && data.valid === false) {
        console.log('Token invalid, logging out');
        logout();
      }
    }
  } catch (err) {
    // Don't logout on network errors to allow offline usage
    console.warn('Token verification skipped:', err.message);
  }
}

// Display user info in navbar or elsewhere
function displayUserInfo() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Update user display elements if they exist
  const userNameEl = document.getElementById('userName');
  const userRoleEl = document.getElementById('userRole');
  const userEmailEl = document.getElementById('userEmail');
  
  if (userNameEl && user.full_name) {
    userNameEl.textContent = user.full_name;
  }
  if (userRoleEl && user.role) {
    userRoleEl.textContent = user.role;
  }
  if (userEmailEl && user.email) {
    userEmailEl.textContent = user.email;
  }
}

// Logout function
function logout() {
  // Clear all auth data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Clear any cached data
  if (typeof dataCache !== 'undefined' && dataCache.invalidateAll) {
    dataCache.invalidateAll();
  }
  
  // Redirect to login
  window.location.href = 'login.html';
}

// Helper function to get auth headers for API calls
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.logout = logout;
  window.getAuthHeaders = getAuthHeaders;
}
