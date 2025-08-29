import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.detail || error.message
    });
    return Promise.reject(error);
  }
);

export const dashboardAPI = {
  // Get complete dashboard data for a city
  getDashboardData: async (state, city) => {
    try {
      const response = await apiClient.get(`/dashboard/${encodeURIComponent(state)}/${encodeURIComponent(city)}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch dashboard data: ${error.response?.data?.detail || error.message}`);
    }
  },

  // Get available locations (states and cities)
  getLocations: async () => {
    try {
      const response = await apiClient.get('/locations');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch locations: ${error.response?.data?.detail || error.message}`);
    }
  },

  // Get recent metrics for a city
  getRecentMetrics: async (state, city, limit = 24) => {
    try {
      const response = await apiClient.get(`/metrics/${encodeURIComponent(state)}/${encodeURIComponent(city)}?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch metrics: ${error.response?.data?.detail || error.message}`);
    }
  },

  // Get active alerts for a city
  getActiveAlerts: async (state, city) => {
    try {
      const response = await apiClient.get(`/alerts/${encodeURIComponent(state)}/${encodeURIComponent(city)}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch alerts: ${error.response?.data?.detail || error.message}`);
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await apiClient.get('/');
      return response.data;
    } catch (error) {
      throw new Error(`Backend health check failed: ${error.message}`);
    }
  }
};

// ============ SEARCH API FUNCTIONS ============
export const searchAPI = {
  // Global search across all data types
  globalSearch: async (query, filters = {}, size = 50) => {
    try {
      const params = new URLSearchParams();
      
      if (query) params.append('q', query);
      if (filters.cities?.length) params.append('cities', filters.cities.join(','));
      if (filters.states?.length) params.append('states', filters.states.join(','));
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.trafficMin !== undefined) params.append('traffic_min', filters.trafficMin);
      if (filters.trafficMax !== undefined) params.append('traffic_max', filters.trafficMax);
      if (filters.aqiMin !== undefined) params.append('aqi_min', filters.aqiMin);
      if (filters.aqiMax !== undefined) params.append('aqi_max', filters.aqiMax);
      if (filters.energyMin !== undefined) params.append('energy_min', filters.energyMin);
      if (filters.energyMax !== undefined) params.append('energy_max', filters.energyMax);
      if (filters.severities?.length) params.append('severities', filters.severities.join(','));
      if (filters.categories?.length) params.append('categories', filters.categories.join(','));
      if (size) params.append('size', size);
      
      const response = await apiClient.get(`/search/global?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(`Global search failed: ${error.response?.data?.detail || error.message}`);
    }
  },

  // Search city metrics with filters
  searchMetrics: async (filters = {}, size = 50) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.cities?.length) params.append('cities', filters.cities.join(','));
      if (filters.states?.length) params.append('states', filters.states.join(','));
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.trafficMin !== undefined) params.append('traffic_min', filters.trafficMin);
      if (filters.trafficMax !== undefined) params.append('traffic_max', filters.trafficMax);
      if (filters.aqiMin !== undefined) params.append('aqi_min', filters.aqiMin);
      if (filters.aqiMax !== undefined) params.append('aqi_max', filters.aqiMax);
      if (filters.energyMin !== undefined) params.append('energy_min', filters.energyMin);
      if (filters.energyMax !== undefined) params.append('energy_max', filters.energyMax);
      if (size) params.append('size', size);
      
      const response = await apiClient.get(`/search/metrics?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(`Metrics search failed: ${error.response?.data?.detail || error.message}`);
    }
  },

  // Search alerts by message content
  searchAlerts: async (query = "", filters = {}, size = 50) => {
    try {
      const params = new URLSearchParams();
      
      if (query) params.append('q', query);
      if (filters.cities?.length) params.append('cities', filters.cities.join(','));
      if (filters.states?.length) params.append('states', filters.states.join(','));
      if (filters.severities?.length) params.append('severities', filters.severities.join(','));
      if (filters.categories?.length) params.append('categories', filters.categories.join(','));
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (size) params.append('size', size);
      
      const response = await apiClient.get(`/search/alerts?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(`Alerts search failed: ${error.response?.data?.detail || error.message}`);
    }
  },

  // Get search suggestions for autocomplete
  getSuggestions: async (query, size = 10) => {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (size) params.append('size', size);
      
      const response = await apiClient.get(`/search/suggestions?${params.toString()}`);
      return response.data;
    } catch (error) {
      // Silently fail for suggestions to avoid disrupting UX
      console.warn('Suggestions failed:', error.message);
      return [];
    }
  },

  // Export search results
  exportSearchResults: async (query, filters = {}, format = 'json') => {
    try {
      const params = new URLSearchParams();
      
      if (query) params.append('q', query);
      if (filters.cities?.length) params.append('cities', filters.cities.join(','));
      if (filters.states?.length) params.append('states', filters.states.join(','));
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.trafficMin !== undefined) params.append('traffic_min', filters.trafficMin);
      if (filters.trafficMax !== undefined) params.append('traffic_max', filters.trafficMax);
      if (filters.aqiMin !== undefined) params.append('aqi_min', filters.aqiMin);
      if (filters.aqiMax !== undefined) params.append('aqi_max', filters.aqiMax);
      if (filters.energyMin !== undefined) params.append('energy_min', filters.energyMin);
      if (filters.energyMax !== undefined) params.append('energy_max', filters.energyMax);
      if (filters.severities?.length) params.append('severities', filters.severities.join(','));
      if (filters.categories?.length) params.append('categories', filters.categories.join(','));
      if (format) params.append('format', format);
      
      const response = await apiClient.get(`/search/export?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(`Export failed: ${error.response?.data?.detail || error.message}`);
    }
  }
};

export default dashboardAPI;