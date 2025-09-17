import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  CheckCircle, 
  Edit, 
  Trash2,
  Mail,
  Phone,
  Calendar,
  DollarSign
} from 'lucide-react';
import { invoiceAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const InvoicePreview = () => {
  const { invoiceNumber } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (invoiceNumber) {
      loadInvoice();
    }
  }, [invoiceNumber]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getInvoice(invoiceNumber);
      
      if (response.data.success) {
        setInvoice(response.data.data);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice');
      navigate('/history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setActionLoading(prev => ({ ...prev, download: true }));
    
    try {
      const response = await invoiceAPI.downloadPDF(invoiceNumber);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded!');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    } finally {
      setActionLoading(prev => ({ ...prev, download: false }));
    }
  };

  const handleMarkPaid = async () => {
    if (!confirm('Mark this invoice as paid?')) return;
    
    setActionLoading(prev => ({ ...prev, markPaid: true }));
    
    try {
      const response = await invoiceAPI.markInvoiceAsPaid(invoiceNumber);
      if (response.data.success) {
        toast.success('Invoice marked as paid!');
        loadInvoice();
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Failed to mark invoice as paid');
    } finally {
      setActionLoading(prev => ({ ...prev, markPaid: false }));
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) return;
    
    setActionLoading(prev => ({ ...prev, delete: true }));
    
    try {
      const response = await invoiceAPI.deleteInvoice(invoiceNumber);
      if (response.data.success) {
        toast.success('Invoice deleted successfully');
        navigate('/history');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    } finally {
      setActionLoading(prev => ({ ...prev, delete: false }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'SA':
        return 'bg-blue-500';
      case 'SHR':
        return 'bg-purple-500';
      case 'STS':
        return 'bg-green-500';
      case 'SDE':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" message="Loading invoice..." />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h2>
        <p className="text-gray-600 mb-6">The invoice you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/history')}
          className="btn-primary"
        >
          Back to Invoice History
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/history')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice Details</h1>
            <p className="text-gray-600 mt-1">{invoice.invoiceNumber}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownload}
            disabled={actionLoading.download}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{actionLoading.download ? 'Downloading...' : 'Download PDF'}</span>
          </button>
          
          {invoice.status !== 'Paid' && invoice.paymentType === 'Initial Payment' && (
            <button
              onClick={handleMarkPaid}
              disabled={actionLoading.markPaid}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{actionLoading.markPaid ? 'Processing...' : 'Mark as Paid'}</span>
            </button>
          )}
          
          <button
            onClick={handleDelete}
            disabled={actionLoading.delete}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{actionLoading.delete ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </motion.div>

      {/* Invoice Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-8 bg-white"
      >
        {/* Company Header */}
        <div className="text-center border-b-2 border-primary-600 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">
            SETTLO TECH SOLUTIONS
          </h1>
          <p className="text-lg text-gray-600 mb-2">Professional Invoice Generator</p>
          <p className="text-sm text-gray-500">
            121AkhilPlaza PerunduraiRoadErode • www.settlo.com • +91 9003633356
          </p>
        </div>

        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 ${getTypeColor(invoice.invoiceType)} rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
              {invoice.invoiceType}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h2>
              <p className="text-gray-600">{invoice.paymentType}</p>
            </div>
          </div>
          
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(invoice.status)}`}>
              {invoice.status}
            </span>
            <div className="mt-2 text-sm text-gray-600">
              <div className="flex items-center justify-end space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Date: {new Date(invoice.invoiceDate).toLocaleDateString()}</span>
              </div>
              {invoice.dueDate && invoice.paymentType === 'Initial Payment' && (
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client Info & Payment Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Client Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
              Bill To:
            </h3>
            <div className="space-y-2">
              <p className="font-semibold text-gray-900 text-lg">{invoice.clientName}</p>
              <div className="flex items-center space-x-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{invoice.clientPhone}</span>
              </div>
              {invoice.clientEmail && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{invoice.clientEmail}</span>
                </div>
              )}
              {invoice.clientAddress && (
                <p className="text-gray-600 whitespace-pre-line">{invoice.clientAddress}</p>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-primary-600" />
              Payment Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Total Amount:</span>
                <span className="font-semibold text-gray-900">₹{invoice.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Collected:</span>
                <span className="font-semibold text-green-600">₹{invoice.collectedAmount.toLocaleString()}</span>
              </div>
              {invoice.pendingAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Pending:</span>
                  <span className="font-semibold text-orange-600">₹{invoice.pendingAmount.toLocaleString()}</span>
                </div>
              )}
              {invoice.taxPercentage > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax ({invoice.taxPercentage}%):</span>
                  <span className="font-semibold">₹{((invoice.subtotalAmount * invoice.taxPercentage) / 100).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Services
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-2 border-gray-800">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-800 px-4 py-3 text-left font-semibold">Description</th>
                  {invoice.paymentType === 'Initial Payment' ? (
                    <>
                      <th className="border border-gray-800 px-4 py-3 text-right font-semibold">Total</th>
                      <th className="border border-gray-800 px-4 py-3 text-right font-semibold">Pending</th>
                      <th className="border border-gray-800 px-4 py-3 text-right font-semibold">Paid</th>
                    </>
                  ) : (
                    <>
                      <th className="border border-gray-800 px-4 py-3 text-center font-semibold">Qty</th>
                      <th className="border border-gray-800 px-4 py-3 text-right font-semibold">Rate</th>
                      <th className="border border-gray-800 px-4 py-3 text-right font-semibold">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-800 px-4 py-3">{item.description}</td>
                    {invoice.paymentType === 'Initial Payment' ? (
                      <>
                        <td className="border border-gray-800 px-4 py-3 text-right font-semibold">
                          ₹{item.rate.toFixed(2)}
                        </td>
                        <td className="border border-gray-800 px-4 py-3 text-right text-orange-600 font-semibold">
                          ₹{(item.pendingPayment || 0).toFixed(2)}
                        </td>
                        <td className="border border-gray-800 px-4 py-3 text-right text-green-600 font-semibold">
                          ₹{(item.rate - (item.pendingPayment || 0)).toFixed(2)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border border-gray-800 px-4 py-3 text-center">{item.quantity}</td>
                        <td className="border border-gray-800 px-4 py-3 text-right">₹{item.rate.toFixed(2)}</td>
                        <td className="border border-gray-800 px-4 py-3 text-right font-semibold">
                          ₹{(item.quantity * item.rate).toFixed(2)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg border-l-4 border-primary-600">
            <h3 className="font-semibold text-gray-900 mb-2">Notes:</h3>
            <p className="text-gray-700 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 border-t border-gray-200">
          <p className="text-lg font-semibold text-primary-600 mb-2">
            Thank you for choosing Settlo Tech Solutions!
          </p>
          <p className="text-sm text-gray-500">
            Generated on {new Date().toLocaleDateString()} | For support: +91 9003633356 | www.settlo.com
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default InvoicePreview;
