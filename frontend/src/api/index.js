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

// On 401 (expired / blacklisted token), clear storage and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('teacher');
      // Hard redirect: removes the current page from the browsable history stack
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
