// Data Cache Manager - Optimizes data loading with caching
class DataCacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 60000; // 1 minute cache expiry
    this.pendingRequests = new Map(); // Prevent duplicate concurrent requests
  }

  // Generate cache key
  getCacheKey(endpoint) {
    return endpoint;
  }

  // Check if cache is valid
  isCacheValid(key) {
    if (!this.cache.has(key)) return false;
    const entry = this.cache.get(key);
    return Date.now() - entry.timestamp < this.cacheExpiry;
  }

  // Get cached data
  getCached(endpoint) {
    const key = this.getCacheKey(endpoint);
    if (this.isCacheValid(key)) {
      return this.cache.get(key).data;
    }
    return null;
  }

  // Set cache data
  setCache(endpoint, data) {
    const key = this.getCacheKey(endpoint);
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Invalidate cache for endpoint
  invalidate(endpoint) {
    const key = this.getCacheKey(endpoint);
    this.cache.delete(key);
  }

  // Invalidate all cache
  invalidateAll() {
    this.cache.clear();
  }

  // Fetch with caching - prevents duplicate requests
  async fetchWithCache(endpoint, forceRefresh = false) {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh) {
      const cached = this.getCached(endpoint);
      if (cached !== null) {
        return cached;
      }
    }

    // If there's already a pending request for this endpoint, wait for it
    if (this.pendingRequests.has(endpoint)) {
      return this.pendingRequests.get(endpoint);
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        this.setCache(endpoint, data);
        return data;
      } finally {
        this.pendingRequests.delete(endpoint);
      }
    })();

    this.pendingRequests.set(endpoint, requestPromise);
    return requestPromise;
  }

  // Prefetch multiple endpoints in parallel
  async prefetchAll(endpoints, forceRefresh = false) {
    const promises = endpoints.map(endpoint => 
      this.fetchWithCache(endpoint, forceRefresh)
    );
    return Promise.allSettled(promises);
  }
}

// Global data cache instance
const dataCache = new DataCacheManager();

// Optimized data loaders using cache
async function loadAllDataParallel(forceRefresh = false) {
  const endpoints = [
    '/api/departments',
    '/api/patients',
    '/api/doctors',
    '/api/appointments'
  ];

  const results = await dataCache.prefetchAll(endpoints, forceRefresh);
  
  const [deptResult, patientResult, doctorResult, appointmentResult] = results;
  
  return {
    departments: deptResult.status === 'fulfilled' ? deptResult.value : [],
    patients: patientResult.status === 'fulfilled' ? patientResult.value : [],
    doctors: doctorResult.status === 'fulfilled' ? doctorResult.value : [],
    appointments: appointmentResult.status === 'fulfilled' ? appointmentResult.value : []
  };
}

// Quick data getters with cache
async function getCachedDepartments(forceRefresh = false) {
  return dataCache.fetchWithCache('/api/departments', forceRefresh);
}

async function getCachedPatients(forceRefresh = false) {
  return dataCache.fetchWithCache('/api/patients', forceRefresh);
}

async function getCachedDoctors(forceRefresh = false) {
  return dataCache.fetchWithCache('/api/doctors', forceRefresh);
}

async function getCachedAppointments(forceRefresh = false) {
  return dataCache.fetchWithCache('/api/appointments', forceRefresh);
}

// Invalidate specific caches after mutations
function invalidateDepartmentsCache() {
  dataCache.invalidate('/api/departments');
}

function invalidatePatientsCache() {
  dataCache.invalidate('/api/patients');
}

function invalidateDoctorsCache() {
  dataCache.invalidate('/api/doctors');
}

function invalidateAppointmentsCache() {
  dataCache.invalidate('/api/appointments');
}

// Skeleton loading HTML generators
function generateTableSkeleton(rows = 5, cols = 5) {
  let html = '';
  for (let i = 0; i < rows; i++) {
    html += '<tr class="skeleton-row">';
    for (let j = 0; j < cols; j++) {
      html += `<td><div class="skeleton-text"></div></td>`;
    }
    html += '</tr>';
  }
  return html;
}

function generateCardSkeleton() {
  return `
    <div class="skeleton-card">
      <div class="skeleton-text skeleton-title"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text" style="width: 60%"></div>
    </div>
  `;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataCacheManager, dataCache };
}
