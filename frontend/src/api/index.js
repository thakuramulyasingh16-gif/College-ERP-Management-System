import axios from 'axios';
import { getToken } from '../utils/api';

const api = axios.create({
  baseURL: 'https://college-erp-management-system-a9xk.onrender.com/api',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

// Response interceptor: handles 401 (expired, blacklisted, or session invalidated)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const data = error.response.data;
      if (data && data.code === 'SESSION_INVALIDATED') {
        sessionStorage.setItem(
          'session_invalidated_msg',
          data.message || 'You have been logged out because your account was signed in from another device.'
        );
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('teacher');

      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    } else if (error.response) {
      console.error(`API Error [${error.config?.method?.toUpperCase()} ${error.config?.url}]:`, error.response.status, error.response.data);
    } else {
      console.error(`Network Error [${error.config?.method?.toUpperCase()} ${error.config?.url}]:`, error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
