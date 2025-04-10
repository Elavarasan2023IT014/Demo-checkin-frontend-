import axios from 'axios';

const api = axios.create({
  baseURL: 'https://demo-checkin-backend.onrender.com/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('employeeToken');
  if (token) config.headers['x-employee-token'] = token;
  return config;
});

export default api;