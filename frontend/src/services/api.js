import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  }
);

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const invoiceAPI = {
  getInvoices: (params = {}) => {
    return api.get('/invoices', { params });
  },

  getAllInvoices: (params = {}) => {
    return api.get('/invoices', { params });
  },

  // ✅ ADDED: Missing analytics method
  getAnalytics: (period = 'monthly') => {
    return api.get('/invoices/analytics/dashboard', { 
      params: { period } 
    });
  },

  getNextInvoiceNumber: (invoiceType) => {
    return api.get(`/invoices/next-number/${invoiceType}`);
  },

  createInvoice: (data) => {
    return api.post('/invoices', data);
  },

  getInvoice: (invoiceNumber) => {
    return api.get(`/invoices/${invoiceNumber}`);
  },

  updateInvoice: (invoiceNumber, data) => {
    return api.put(`/invoices/${invoiceNumber}`, data);
  },

  markInvoiceAsPaid: (invoiceNumber) => {
    return api.patch(`/invoices/${invoiceNumber}/mark-paid`);
  },

  deleteInvoice: (invoiceNumber) => {
    return api.delete(`/invoices/${invoiceNumber}`);
  },

  downloadPDF: (invoiceNumber) => {
    return api.get(`/invoices/${invoiceNumber}/pdf`, {
      responseType: 'blob'
    });
  }
};

export default api;
