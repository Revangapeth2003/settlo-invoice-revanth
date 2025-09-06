const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

// Get all invoices with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      invoiceType, 
      search,
      startDate,
      endDate 
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (invoiceType && invoiceType !== 'all') {
      filter.invoiceType = invoiceType;
    }
    
    if (search) {
      filter.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { clientPhone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const invoices = await Invoice.find(filter)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .exec();

    const total = await Invoice.countDocuments(filter);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: options.page,
        pages: Math.ceil(total / options.limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single invoice
router.get('/:invoiceNumber', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      invoiceNumber: req.params.invoiceNumber 
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new invoice
router.post('/', async (req, res) => {
  try {
    // Generate invoice number if not provided
    if (!req.body.invoiceNumber) {
      const { invoiceType } = req.body;
      const latestInvoice = await Invoice.findOne({ invoiceType })
        .sort({ createdAt: -1 });
      
      let nextNumber = 1;
      if (latestInvoice) {
        const currentNumber = parseInt(latestInvoice.invoiceNumber.split('-')[1]);
        nextNumber = currentNumber + 1;
      }
      
      req.body.invoiceNumber = `${invoiceType}-${String(nextNumber).padStart(3, '0')}`;
    }

    const invoice = new Invoice(req.body);
    await invoice.save();

    // Generate PDF
    try {
      const pdfBuffer = await generateInvoicePDF(invoice);
      // In production, you'd upload this to cloud storage
      invoice.pdfUrl = `/api/invoices/${invoice.invoiceNumber}/pdf`;
      await invoice.save();
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      // Continue without PDF if generation fails
    }

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully'
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update invoice
router.put('/:invoiceNumber', async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { invoiceNumber: req.params.invoiceNumber },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    res.json({
      success: true,
      data: invoice,
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Mark invoice as paid
router.patch('/:invoiceNumber/mark-paid', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      invoiceNumber: req.params.invoiceNumber 
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    invoice.status = 'Paid';
    invoice.collectedAmount = invoice.totalAmount;
    invoice.pendingAmount = 0;
    await invoice.save();

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice marked as paid successfully'
    });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete invoice
router.delete('/:invoiceNumber', async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ 
      invoiceNumber: req.params.invoiceNumber 
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get analytics data
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarterly':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // monthly
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const invoices = await Invoice.find({
      invoiceDate: { $gte: startDate }
    });

    // Calculate analytics
    const analytics = {
      totalInvoices: invoices.length,
      totalRevenue: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      collectedAmount: invoices.reduce((sum, inv) => sum + inv.collectedAmount, 0),
      pendingAmount: invoices.reduce((sum, inv) => sum + inv.pendingAmount, 0),
      paidCount: invoices.filter(inv => inv.status === 'Paid').length,
      pendingCount: invoices.filter(inv => inv.status === 'Pending').length,
      overdueCount: invoices.filter(inv => inv.status === 'Overdue').length,
      
      // Service type breakdown
      serviceTypes: {
        SA: invoices.filter(inv => inv.invoiceType === 'SA').length,
        SHR: invoices.filter(inv => inv.invoiceType === 'SHR').length,
        STS: invoices.filter(inv => inv.invoiceType === 'STS').length,
        SDE: invoices.filter(inv => inv.invoiceType === 'SDE').length,
      },
      
      // Monthly trends
      monthlyData: getMonthlyData(invoices)
    };

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate PDF endpoint
router.get('/:invoiceNumber/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      invoiceNumber: req.params.invoiceNumber 
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    const pdfBuffer = await generateInvoicePDF(invoice);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function for monthly data
function getMonthlyData(invoices) {
  const monthlyData = {};
  
  invoices.forEach(invoice => {
    const monthKey = invoice.invoiceDate.toISOString().substring(0, 7); // YYYY-MM
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        revenue: 0,
        collected: 0,
        count: 0,
        paid: 0,
        pending: 0
      };
    }
    
    monthlyData[monthKey].revenue += invoice.totalAmount;
    monthlyData[monthKey].collected += invoice.collectedAmount;
    monthlyData[monthKey].count += 1;
    
    if (invoice.status === 'Paid') {
      monthlyData[monthKey].paid += 1;
    } else {
      monthlyData[monthKey].pending += 1;
    }
  });
  
  return monthlyData;
}

module.exports = router;
