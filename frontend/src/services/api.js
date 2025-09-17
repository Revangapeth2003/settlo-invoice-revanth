import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'An error occurred';
    
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.');
    } else {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

// Invoice API methods
export const invoiceAPI = {
  // Get all invoices
  getInvoices: (params = {}) => 
    api.get('/invoices', { params }),

  // Get single invoice
  getInvoice: (invoiceNumber) => 
    api.get(`/invoices/${invoiceNumber}`),

  // Create invoice
  createInvoice: (data) => 
    api.post('/invoices', data),

  // Update invoice
  updateInvoice: (invoiceNumber, data) => 
    api.put(`/invoices/${invoiceNumber}`, data),

  // Mark invoice as paid
  markInvoiceAsPaid: (invoiceNumber) => 
    api.patch(`/invoices/${invoiceNumber}/mark-paid`),

  // Delete invoice
  deleteInvoice: (invoiceNumber) => 
    api.delete(`/invoices/${invoiceNumber}`),

  // Get analytics
  getAnalytics: (period = 'monthly') => 
    api.get('/invoices/analytics/dashboard', { params: { period } }),

  // Download PDF
  downloadPDF: (invoiceNumber) => 
    api.get(`/invoices/${invoiceNumber}/pdf`, { 
      responseType: 'blob'
    }),
};

export default api;
