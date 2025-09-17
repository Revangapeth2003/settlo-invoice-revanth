import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  X
} from 'lucide-react';
import { invoiceAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const InvoiceHistory = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [markingPaid, setMarkingPaid] = useState({});

  const searchInputRef = useRef(null);
  const [shouldMaintainFocus, setShouldMaintainFocus] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      if (searchQuery !== debouncedSearchQuery) {
        setCurrentPage(1);
        setShouldMaintainFocus(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  // Maintain focus after re-render
  useEffect(() => {
    if (shouldMaintainFocus && searchInputRef.current) {
      searchInputRef.current.focus();
      setShouldMaintainFocus(false);
    }
  }, [shouldMaintainFocus, invoices]);

  useEffect(() => {
    loadInvoices();
  }, [currentPage, debouncedSearchQuery, statusFilter, typeFilter]);

  const loadInvoices = async () => {
    try {
      if (!shouldMaintainFocus) setLoading(true);

      const params = {
        page: currentPage,
        limit: 10,
        ...(debouncedSearchQuery.trim() && { search: debouncedSearchQuery.trim() }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { invoiceType: typeFilter }),
      };

      const response = await invoiceAPI.getInvoices(params);
      if (response.data.success) {
        setInvoices(response.data.data);
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
    toast.success('Invoices refreshed!');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Fixed handleMarkPaid with event.preventDefault()
  const handleMarkPaid = async (invoiceNumber, event) => {
    // Prevent any default behavior or page refresh
    if (event) event.preventDefault();
    
    try {
      setMarkingPaid(prev => ({ ...prev, [invoiceNumber]: true }));
      const loadingToast = toast.loading('Marking invoice as paid...');

      const response = await invoiceAPI.markInvoiceAsPaid(invoiceNumber);
      toast.dismiss(loadingToast);

      if (response.data.success) {
        toast.success('Invoice marked as paid successfully!');

        // Optimistic UI update
        setInvoices(prevInvoices =>
          prevInvoices.map(invoice =>
            invoice.invoiceNumber === invoiceNumber
              ? { ...invoice, status: 'Paid', collectedAmount: invoice.totalAmount, pendingAmount: 0 }
              : invoice
          )
        );

        // Refresh from backend after delay to ensure consistency
        setTimeout(() => {
          loadInvoices();
        }, 2000);
      } else {
        toast.error(response.data.message || 'Failed to mark invoice as paid');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to mark invoice as paid');
      console.error(error);
    } finally {
      setMarkingPaid(prev => ({ ...prev, [invoiceNumber]: false }));
    }
  };

  const handleDelete = async (invoiceNumber) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) return;
    try {
      const response = await invoiceAPI.deleteInvoice(invoiceNumber);
      if (response.data.success) {
        toast.success('Invoice deleted successfully');
        loadInvoices();
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleDownload = async (invoiceNumber) => {
    try {
      const response = await invoiceAPI.downloadPDF(invoiceNumber);
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
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'Overdue':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
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

  if (loading && currentPage === 1 && !shouldMaintainFocus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" message="Loading invoices..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice History</h1>
          <p className="text-gray-600 mt-1">Manage and track all your invoices in one place</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/create"
            className="flex items-center space-x-2 px-4 py-2 gradient-primary text-white rounded-lg hover:shadow-lg transition-all duration-200"
          >
            <FileText className="w-4 h-4" />
            <span>New Invoice</span>
          </Link>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by client name, invoice number..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="SA">Settlo Academy</option>
              <option value="SHR">Settlo HR</option>
              <option value="STS">Settlo Tech Solutions</option>
              <option value="SDE">Settlo Distance Education</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Clear All Filters
          </button>
        </div>

        {/* Active Filters Display */}
        {(debouncedSearchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
          <div className="mt-4 flex items-center space-x-2 text-sm">
            <span className="text-gray-500">Active filters:</span>
            {debouncedSearchQuery && (
              <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
                Search: "{debouncedSearchQuery}"
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
                Status: {statusFilter}
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
                Type: {typeFilter}
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Invoice List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card overflow-hidden"
      >
        {loading && shouldMaintainFocus ? (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span className="text-sm">Searching...</span>
            </div>
          </div>
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice, index) => (
                  <motion.tr
                    key={invoice._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className={`w-8 h-8 ${getTypeColor(
                            invoice.invoiceType
                          )} rounded-lg flex items-center justify-center text-white text-xs font-semibold mr-3`}
                        >
                          {invoice.invoiceType}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                          <div className="text-sm text-gray-500">{invoice.paymentType || 'N/A'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{invoice.clientName}</div>
                        <div className="text-sm text-gray-500">{invoice.clientPhone}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          ₹{invoice.totalAmount?.toLocaleString() || '0'}
                        </div>
                        {invoice.paymentType === 'Initial Payment' && (
                          <div className="text-xs text-gray-500">
                            Collected: ₹{invoice.collectedAmount?.toLocaleString() || '0'}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1">{invoice.status}</span>
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/invoice/${invoice.invoiceNumber}`}
                          className="text-primary-600 hover:text-primary-900 p-2 hover:bg-primary-50 rounded-lg transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleDownload(invoice.invoiceNumber)}
                          className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors duration-200"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Fixed Mark as Paid Button */}
                        {invoice.status !== 'Paid' && (
                          <button
                            onClick={(e) => handleMarkPaid(invoice.invoiceNumber, e)}
                            disabled={markingPaid[invoice.invoiceNumber]}
                            type="button"
                            className={`p-2 rounded-lg transition-colors duration-200 ${
                              markingPaid[invoice.invoiceNumber]
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
                            }`}
                            title="Mark as Paid"
                          >
                            {markingPaid[invoice.invoiceNumber] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(invoice.invoiceNumber)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-6">
              {debouncedSearchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by creating your first invoice.'}
            </p>
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 gradient-primary text-white rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Invoice
            </Link>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Previous
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      currentPage === page
                        ? 'bg-primary-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Next
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default InvoiceHistory;
