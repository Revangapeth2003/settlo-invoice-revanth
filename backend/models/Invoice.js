const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  invoiceType: {
    type: String,
    required: true,
    enum: ['SA', 'SHR', 'STS', 'SDE']
  },
  clientName: {
    type: String,
    required: true
  },
  clientPhone: {
    type: String,
    required: true
  },
  clientEmail: {
    type: String,
    default: ''
  },
  clientAddress: {
    type: String,
    default: ''
  },
  paymentType: {
    type: String,
    enum: ['Full Payment', 'Initial Payment'],
    default: 'Full Payment'
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  subtotalAmount: {
    type: Number,
    default: 0
  },
  taxPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue'],
    default: 'Pending'
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    default: null
  },
  collectedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    },
    pendingPayment: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  notes: {
    type: String,
    default: ''
  },
  pdfUrl: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for better query performance
InvoiceSchema.index({ invoiceType: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1, invoiceDate: -1 });
InvoiceSchema.index({ clientName: 'text', invoiceNumber: 'text' });

// Pre-save middleware to calculate amounts
InvoiceSchema.pre('save', function(next) {
  if (this.paymentType === 'Full Payment') {
    this.collectedAmount = this.totalAmount;
    this.pendingAmount = 0;
    this.status = 'Paid';
  } else {
    // Calculate from items for Initial Payment
    let totalItemAmount = 0;
    let totalPendingAmount = 0;
    
    this.items.forEach(item => {
      const itemTotal = item.rate * item.quantity;
      totalItemAmount += itemTotal;
      totalPendingAmount += item.pendingPayment || 0;
    });
    
    this.collectedAmount = totalItemAmount - totalPendingAmount;
    this.pendingAmount = totalPendingAmount;
    
    if (this.pendingAmount <= 0) {
      this.status = 'Paid';
    } else if (this.dueDate && new Date(this.dueDate) < new Date()) {
      this.status = 'Overdue';
    } else {
      this.status = 'Pending';
    }
  }
  next();
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
