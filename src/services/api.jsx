import axios from 'axios';

const api = axios.create({
  baseURL: 'https://demo-checkin-backend.onrender.com/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('employeeToken');
  if (token) config.headers['x-employee-token'] = token;
  console.log('Request URL:', config.url);
  return config;
}, (error) => {
  console.error('Request error:', error);
  return Promise.reject(error);
});

api.interceptors.response.use((response) => response, (error) => {
  console.error('Response error:', error.response ? error.response.data : error.message);
  return Promise.reject(error);
});

export default api;