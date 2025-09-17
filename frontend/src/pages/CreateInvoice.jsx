import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Minus, 
  Save, 
  FileText, 
  User, 
  Calendar,
  DollarSign,
  Settings,
  Trash2
} from 'lucide-react';
import { invoiceAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';


const CreateInvoice = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    invoiceType: 'SA',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    paymentType: 'Full Payment',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [
      { description: '', quantity: 1, rate: 0, pendingPayment: 0 }
    ],
    taxPercentage: 0
  });


  const invoiceTypes = [
    { label: 'Settlo Academy (SA)', value: 'SA' },
    { label: 'Settlo HR (SHR)', value: 'SHR' },
    { label: 'Settlo Tech Solutions (STS)', value: 'STS' },
    { label: 'Settlo Distance Education (SDE)', value: 'SDE' },
  ];


  const paymentTypes = [
    { label: 'Full Payment', value: 'Full Payment' },
    { label: 'Initial Payment', value: 'Initial Payment' },
  ];


  // Set default due date when payment type is Initial Payment
  useEffect(() => {
    if (formData.paymentType === 'Initial Payment' && !formData.dueDate) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        dueDate: dueDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.paymentType]);


  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'quantity' || field === 'rate' || field === 'pendingPayment' 
        ? parseFloat(value) || 0 
        : value
    };
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };


  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { description: '', quantity: 1, rate: 0, pendingPayment: 0 }
      ]
    }));
  };


  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  };


  const calculateSubtotal = () => {
    if (formData.paymentType === 'Initial Payment') {
      return formData.items.reduce((sum, item) => 
        sum + (item.rate - (item.pendingPayment || 0)), 0
      );
    }
    return formData.items.reduce((sum, item) => 
      sum + (item.quantity * item.rate), 0
    );
  };


  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = subtotal * (formData.taxPercentage / 100);
    return subtotal + taxAmount;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.clientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    
    if (!formData.clientPhone.trim()) {
      toast.error('Client phone is required');
      return;
    }
    
    if (!formData.items[0].description.trim()) {
      toast.error('At least one service description is required');
      return;
    }


    setLoading(true);
    
    try {
      // Prepare data for API
      const invoiceData = {
        ...formData,
        totalAmount: calculateTotal(),
        subtotalAmount: calculateSubtotal(),
        invoiceDate: new Date(formData.invoiceDate),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null
      };


      const response = await invoiceAPI.createInvoice(invoiceData);
      
      if (response.data.success) {
        toast.success('Invoice created successfully!');
        navigate(`/invoice/${response.data.data.invoiceNumber}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };


  const resetForm = () => {
    setFormData({
      invoiceType: 'SA',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
      paymentType: 'Full Payment',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      items: [
        { description: '', quantity: 1, rate: 0, pendingPayment: 0 }
      ],
      taxPercentage: 0
    });
    toast.success('Form reset successfully');
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
          <p className="text-gray-600 mt-1">Generate professional invoices quickly</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            <Settings className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </motion.div>


      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center space-x-2 mb-6">
            <FileText className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Invoice Details</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Type *
              </label>
              <select
                value={formData.invoiceType}
                onChange={(e) => handleInputChange('invoiceType', e.target.value)}
                className="input"
                required
              >
                {invoiceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type *
              </label>
              <select
                value={formData.paymentType}
                onChange={(e) => handleInputChange('paymentType', e.target.value)}
                className="input"
                required
              >
                {paymentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                  className="input pl-10"
                  required
                />
              </div>
            </div>
            
            {formData.paymentType === 'Initial Payment' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Status Preview */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Status Preview:</span>
              <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                formData.paymentType === 'Full Payment' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {formData.paymentType === 'Full Payment' ? '✓ Paid' : '⏳ Pending'}
              </span>
            </div>
          </div>
        </motion.div>


        {/* Client Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center space-x-2 mb-6">
            <User className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Client Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                placeholder="Enter client name"
                className="input"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.clientPhone}
                onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                placeholder="Enter phone number"
                className="input"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                placeholder="Enter email address"
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.clientAddress}
                onChange={(e) => handleInputChange('clientAddress', e.target.value)}
                placeholder="Enter client address"
                rows={3}
                className="input"
              />
            </div>
          </div>
        </motion.div>


        {/* Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Services</h3>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center space-x-2 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>
          
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                className="p-4 border border-gray-200 rounded-lg bg-gray-50"
              >
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Service {index + 1}</h4>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Enter service description"
                      className="input"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.paymentType === 'Full Payment' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rate (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          className="input"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount
                        </label>
                        <div className="input bg-gray-100 text-gray-600 font-semibold">
                          ₹{(item.quantity * item.rate).toFixed(2)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pending (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.pendingPayment}
                          onChange={(e) => handleItemChange(index, 'pendingPayment', e.target.value)}
                          className="input"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Paid Amount
                        </label>
                        <div className="input bg-green-50 text-green-700 font-semibold">
                          ₹{(item.rate - (item.pendingPayment || 0)).toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>


        {/* Additional Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <div className="flex items-center space-x-2 mb-6">
            <Settings className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Additional Details</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.taxPercentage}
                onChange={(e) => handleInputChange('taxPercentage', parseFloat(e.target.value) || 0)}
                placeholder="Enter tax percentage"
                className="input"
              />
            </div>
          </div>
          
          {/* Invoice Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Invoice Summary</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {formData.paymentType === 'Initial Payment' ? 'Amount Paid:' : 'Subtotal:'}
                </span>
                <span className="font-medium">₹{calculateSubtotal().toFixed(2)}</span>
              </div>
              
              {formData.paymentType === 'Initial Payment' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pending Amount:</span>
                  <span className="font-medium text-orange-600">
                    ₹{formData.items.reduce((sum, item) => sum + (item.pendingPayment || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
              
              {formData.taxPercentage > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({formData.taxPercentage}%):</span>
                  <span className="font-medium">₹{(calculateSubtotal() * (formData.taxPercentage / 100)).toFixed(2)}</span>
                </div>
              )}
              
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-primary-600">₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>


        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-end space-x-4"
        >
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className={`btn-primary min-w-[150px] ${loading ? 'btn-loading' : ''}`}
          >
            {loading ? (
              'Creating...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Invoice
              </>
            )}
          </button>
        </motion.div>
      </form>
    </div>
  );
};


export default CreateInvoice;
