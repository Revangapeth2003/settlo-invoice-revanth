const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const Invoice = require('../models/Invoice'); // Add this import

const generateInvoicePDF = async (invoiceData) => {
  let browser;
  
  try {
    // IMPORTANT: Fetch fresh data from database to ensure latest status
    let freshInvoiceData = invoiceData;
    if (invoiceData.invoiceNumber) {
      const freshInvoice = await Invoice.findOne({ 
        invoiceNumber: invoiceData.invoiceNumber 
      });
      if (freshInvoice) {
        freshInvoiceData = freshInvoice.toObject();
        console.log('Using fresh invoice data for PDF:', {
          invoiceNumber: freshInvoiceData.invoiceNumber,
          status: freshInvoiceData.status,
          collectedAmount: freshInvoiceData.collectedAmount
        });
      }
    }

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Generate HTML with fresh data
    const htmlContent = await generateInvoiceHTML(freshInvoiceData);
    
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle2' // Changed from networkidle0
    });
    
    // Add delay to ensure all rendering is complete
    await page.waitForTimeout(1000);
    
    // Emulate screen media for proper CSS rendering
    await page.emulateMediaType('screen');
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });
    
    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const generateInvoiceHTML = async (invoice) => {
  // Calculate amounts based on payment type and current status
  const calculateAmounts = () => {
    // If invoice is marked as Paid, show collected amount as total
    if (invoice.status === 'Paid') {
      return {
        collectedAmount: invoice.totalAmount,
        pendingAmount: 0,
        totalProjectValue: invoice.totalAmount
      };
    }
    
    if (invoice.paymentType === 'Full Payment') {
      return {
        collectedAmount: invoice.totalAmount,
        pendingAmount: 0,
        totalProjectValue: invoice.totalAmount
      };
    } else {
      let totalItemAmount = 0;
      let totalPendingAmount = 0;
      
      invoice.items.forEach(item => {
        const itemTotal = item.rate * item.quantity;
        totalItemAmount += itemTotal;
        totalPendingAmount += item.pendingPayment || 0;
      });
      
      return {
        collectedAmount: totalItemAmount - totalPendingAmount,
        pendingAmount: totalPendingAmount,
        totalProjectValue: totalItemAmount
      };
    }
  };

  const { collectedAmount, pendingAmount, totalProjectValue } = calculateAmounts();

  // Function to convert image to base64
  const getImageBase64 = (imagePath) => {
    try {
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        const imageExtension = path.extname(imagePath).toLowerCase();
        let mimeType = 'image/png';
        
        if (imageExtension === '.jpg' || imageExtension === '.jpeg') {
          mimeType = 'image/jpeg';
        } else if (imageExtension === '.gif') {
          mimeType = 'image/gif';
        }
        
        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      } else {
        console.log(`Image not found: ${imagePath}`);
        return null;
      }
    } catch (error) {
      console.error(`Error reading image ${imagePath}:`, error);
      return null;
    }
  };

  // Fallback SVG generator for missing images
  const generateFallbackSVG = (imageName) => {
    if (imageName.includes('signature')) {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="150" height="75" xmlns="http://www.w3.org/2000/svg">
          <rect width="150" height="75" fill="#f8f9fa" stroke="#ddd" stroke-width="1"/>
          <text x="75" y="35" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">Authorized</text>
          <text x="75" y="55" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">Signature</text>
        </svg>
      `)}`;
    } else {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="35" fill="#2E3B82"/>
          <text x="40" y="50" font-family="Arial" font-size="24" fill="white" text-anchor="middle">S</text>
        </svg>
      `)}`;
    }
  };

  // Try multiple possible paths for images
  const possibleLogoPaths = [
    path.join(__dirname, '../assets/logo.png'),
    path.join(__dirname, './assets/logo.png'),
    path.join(__dirname, 'assets/logo.png'),
    path.join(process.cwd(), 'assets/logo.png'),
    path.join(process.cwd(), 'backend/assets/logo.png')
  ];

  const possibleSignaturePaths = [
    path.join(__dirname, '../assets/signature.png'),
    path.join(__dirname, './assets/signature.png'),
    path.join(__dirname, 'assets/signature.png'),
    path.join(process.cwd(), 'assets/signature.png'),
    path.join(process.cwd(), 'backend/assets/signature.png')
  ];

  let logoBase64 = null;
  let signatureBase64 = null;

  // Find logo
  for (const logoPath of possibleLogoPaths) {
    logoBase64 = getImageBase64(logoPath);
    if (logoBase64) {
      console.log(`Logo found at: ${logoPath}`);
      break;
    }
  }

  // Find signature
  for (const signaturePath of possibleSignaturePaths) {
    signatureBase64 = getImageBase64(signaturePath);
    if (signatureBase64) {
      console.log(`Signature found at: ${signaturePath}`);
      break;
    }
  }

  // Use fallbacks if images not found
  if (!logoBase64) {
    logoBase64 = generateFallbackSVG('logo');
  }
  if (!signatureBase64) {
    signatureBase64 = generateFallbackSVG('signature');
  }

  // Updated status display logic
  const getStatusDisplay = () => {
    if (invoice.status === 'Paid') {
      return '✅ FULLY PAID';
    } else if (invoice.paymentType === 'Full Payment') {
      return '✅ FULL PAYMENT - PAID';
    } else {
      return `⏳ INITIAL PAYMENT - ${pendingAmount > 0 ? 'PENDING BALANCE' : 'COMPLETED'}`;
    }
  };

  const getStatusColor = () => {
    if (invoice.status === 'Paid') {
      return '#4CAF50'; // Green for paid
    } else if (invoice.paymentType === 'Full Payment') {
      return '#4CAF50'; // Green for full payment
    } else {
      return '#FF9800'; // Orange for pending
    }
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.4;
            font-size: 12px;
          }
          
          .invoice-header {
            position: relative;
            margin-bottom: 30px;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 20px;
            min-height: 120px;
          }
          
          .company-info {
            width: 60%;
            float: left;
          }
          
          .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #2E3B82;
            margin-bottom: 3px;
          }
          
          .company-tagline {
            font-size: 16px;
            color: #2E3B82;
            margin-bottom: 10px;
          }
          
          .company-address {
            font-size: 11px;
            color: #666;
            line-height: 1.3;
            margin-bottom: 15px;
          }
          
          .account-details {
            width: 55%;
            margin-top: 15px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 3px solid #2E3B82;
          }
          
          .account-title {
            font-size: 12px;
            font-weight: bold;
            color: #2E3B82;
            margin-bottom: 8px;
          }
          
          .account-info {
            font-size: 10px;
            color: #666;
            line-height: 1.4;
          }
          
          .logo-invoice-section {
            position: absolute;
            top: 0;
            right: 0;
            text-align: center;
            width: 150px;
          }
          
          .settlo-logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: block;
          }
          
          .invoice-details {
            text-align: center;
          }
          
          .invoice-number {
            font-size: 16px;
            font-weight: bold;
            color: #2E3B82;
            margin-bottom: 8px;
          }
          
          .invoice-date {
            font-size: 11px;
            color: #666;
          }
          
          .clearfix::after {
            content: "";
            display: table;
            clear: both;
          }
          
          .client-section {
            margin: 30px 0;
            clear: both;
          }
          
          .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #2E3B82;
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }
          
          .client-details {
            font-size: 12px;
            line-height: 1.5;
          }
          
          .services-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            font-size: 12px;
            border: 2px solid #333;
          }
          
          .services-table th {
            background: white;
            color: #333;
            padding: 12px 10px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #333;
          }
          
          .services-table td {
            padding: 10px;
            border: 1px solid #333;
            background: white;
          }
          
          .amount-cell {
            text-align: right;
            font-weight: bold;
            color: #2E3B82;
          }
          
          .due-date-cell {
            text-align: center;
            font-weight: bold;
            color: #FF5722;
          }
          
          .payment-summary {
            margin-top: 25px;
            text-align: right;
            font-size: 12px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          
          .summary-label {
            color: #666;
            font-weight: 500;
          }
          
          .summary-value {
            font-weight: bold;
            color: #333;
            min-width: 100px;
          }
          
          .collected-amount {
            color: #4CAF50 !important;
            font-weight: bold;
          }
          
          .pending-amount {
            color: #FF5722 !important;
            font-weight: bold;
          }
          
          .total-row {
            border-top: 2px solid #4CAF50;
            padding-top: 10px;
            margin-top: 10px;
            font-size: 16px;
            font-weight: bold;
            color: #2E3B82;
          }
          
          .highlight-box {
            background: linear-gradient(45deg, #e8f5e8, #c8e6c9);
            border: 2px solid ${getStatusColor()};
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }
          
          .payment-status {
            font-size: 18px;
            font-weight: bold;
            color: ${getStatusColor()};
          }
          
          .footer {
            margin-top: 50px;
            border-top: 2px solid #eee;
            padding-top: 30px;
          }
          
          .signature-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 0;
          }
          
          .signature-left {
            flex: 0 0 auto;
          }
          
          .signature-image {
            width: 150px;
            height: 75px;
            border-radius: 5px;
            border: 1px solid #ddd;
          }
          
          .signature-right {
            flex: 1;
            text-align: right;
            padding-left: 20px;
          }
          
          .thank-you-text {
            color: #666;
            font-size: 11px;
            line-height: 1.4;
          }
          
          .notes-section {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #2196F3;
            font-size: 12px;
          }
          
          .company-website {
            color: #2E3B82;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="invoice-header clearfix">
          <div class="company-info">
            <div class="company-name">Settlo Academy &</div>
            <div class="company-tagline">Settlo Tech Solutions</div>
            <div class="company-address">
              121 Akhil Plaza, Perundurai Road, Erode<br>
              <a href="https://www.settlo.com" class="company-website">www.settlo.com</a>, +91 9003633356
            </div>
            
            <!-- Account Details Section -->
            <div class="account-details">
              <div class="account-title">Account Details:</div>
              <div class="account-info">
                Bank Name: HDFC Bank<br>
                Name: Settlo Academy Private Limited<br>
                Account no: 50200084906174<br>
                Branch: Palayapalayam, Erode<br>
                IFSC Code: HDFC0009203<br>
                MICR Code: 638240010
              </div>
            </div>
          </div>
          
          <div class="logo-invoice-section">
            <img src="${logoBase64}" alt="Settlo Logo" class="settlo-logo">
            <div class="invoice-details">
              <div class="invoice-number">INVOICE # ${invoice.invoiceNumber}</div>
              <div class="invoice-date">
                Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                ${invoice.paymentType === 'Initial Payment' && invoice.dueDate ? 
                  `<br>Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}` : ''
                }
              </div>
            </div>
          </div>
        </div>

        <div class="client-section">
          <div class="section-title">Bill To:</div>
          <div class="client-details">
            <strong>${invoice.clientName}</strong><br>
            Phone: ${invoice.clientPhone}<br>
            ${invoice.clientEmail ? `Email: ${invoice.clientEmail}<br>` : ''}
            ${invoice.clientAddress ? invoice.clientAddress.replace(/\n/g, '<br>') : ''}
          </div>
        </div>

        <!-- Payment Status Banner -->
        <div class="highlight-box">
          <div class="payment-status">
            ${getStatusDisplay()}
          </div>
        </div>

        <!-- Services Table with Due Date Column -->
        <table class="services-table">
          <thead>
            <tr>
              <th style="width: 20%;">Service</th>
              <th style="width: 45%;">Description</th>
              <th style="width: 20%;">Amount</th>
              <th style="width: 15%;">Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => {
              const itemRate = item.rate;
              const itemQty = item.quantity;
              const displayAmount = (itemRate * itemQty).toFixed(2);
              
              return `
                <tr>
                  <td><strong>${item.description.split(' ')[0] || 'Service'}</strong></td>
                  <td>${item.description}</td>
                  <td class="amount-cell">₹${displayAmount}</td>
                  <td class="due-date-cell">
                    ${invoice.paymentType === 'Initial Payment' && invoice.dueDate ? 
                      new Date(invoice.dueDate).toLocaleDateString('en-IN') : 
                      (invoice.status === 'Paid' ? '-' : '-')}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Payment Summary (from second code with better styling) -->
        <div class="payment-summary">
          <div class="summary-row">
            <span class="summary-label">Amount Collected:</span>
            <span class="summary-value collected-amount">₹${collectedAmount.toFixed(2)}</span>
          </div>
          
          ${pendingAmount > 0 ? `
          <div class="summary-row">
            <span class="summary-label">Pending Amount:</span>
            <span class="summary-value pending-amount">₹${pendingAmount.toFixed(2)}</span>
          </div>
          ` : ''}
          
          ${invoice.taxPercentage > 0 ? `
          <div class="summary-row">
            <span class="summary-label">Tax (${invoice.taxPercentage}%):</span>
            <span class="summary-value">₹${(totalProjectValue * (invoice.taxPercentage / 100)).toFixed(2)}</span>
          </div>
          ` : ''}
          
          <div class="summary-row total-row">
            <span>Total Project Value:</span>
            <span>₹${totalProjectValue.toFixed(2)}</span>
          </div>
        </div>

        ${invoice.notes ? `
        <div class="notes-section">
          <strong>Notes:</strong><br>
          ${invoice.notes.replace(/\n/g, '<br>')}
        </div>
        ` : ''}

        <div class="footer">
          <div class="signature-section">
            <div class="signature-left">
              <img src="${signatureBase64}" alt="Authorized Signature" class="signature-image">
            </div>
            
            <div class="signature-right">
              <div class="thank-you-text">
                <strong>Thank you for choosing Settlo Tech Solutions!</strong><br>
                Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}<br>
                For support: +91 9003633356 | <a href="https://www.settlo.com" class="company-website">www.settlo.com</a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

module.exports = { generateInvoicePDF };
