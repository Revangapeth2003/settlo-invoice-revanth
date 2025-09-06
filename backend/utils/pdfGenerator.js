const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const generateInvoicePDF = async (invoiceData) => {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    const htmlContent = await generateInvoiceHTML(invoiceData);
    
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0' 
    });
    
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
  // Calculate amounts based on payment type
  const calculateAmounts = () => {
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

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.4;
            font-size: 12px;
          }
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 20px;
          }
          .company-info {
            flex: 1;
          }
          .company-logo {
            margin-bottom: 15px;
          }
          .company-logo img {
            max-width: 180px;
            height: auto;
            display: block;
          }
          
          .company-tagline {
           font-size: 20px;
            font-weight: bold;
            color: #2E3B82;
            margin-bottom: 3px;
          }
          .company-address {
            font-size: 11px;
            color: #666;
            line-height: 1.3;
          }
          .invoice-details {
            text-align: right;
          }
          .invoice-number {
            font-size: 20px;
            font-weight: bold;
            color: #2E3B82;
            margin-bottom: 8px;
          }
          .invoice-date {
            font-size: 11px;
            color: #666;
          }
          .client-section {
            margin: 30px 0;
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
            color: #4CAF50;
            font-weight: bold;
          }
          .pending-amount {
            color: #FF5722;
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
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }
          .payment-status {
            font-size: 18px;
            font-weight: bold;
            color: ${invoice.paymentType === 'Full Payment' ? '#4CAF50' : '#FF9800'};
          }
          .footer {
            margin-top: 50px;
            border-top: 2px solid #eee;
            padding-top: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .footer-content {
            flex: 1;
          }
          .footer-signature {
            text-align: right;
            min-width: 200px;
          }
          .signature-image {
            max-width: 120px;
            height: auto;
            margin-bottom: 10px;
            display: block;
            margin-left: auto;
          }
          .signature-text {
            font-size: 14px;
            color: #666;
            font-weight: bolder;
          }
          .company-website {
            color: #2E3B82;
            text-decoration: none;
            font-weight: bold;
          }
          .placeholder-logo {
            width: 180px;
            height: 60px;
            background: #f0f0f0;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 15px;
            font-size: 10px;
            color: #999;
          }
          .placeholder-signature {
            width: 120px;
            height: 40px;
            background: #f0f0f0;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
            margin-left: auto;
            font-size: 10px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div class="company-info">
            <div class="company-logo">
              ${logoBase64 ? 
                `<img src="${logoBase64}" alt="Company Logo"/>` :
                `<div class="placeholder-logo">LOGO</div>`
              }
            </div>

            <div class="company-tagline">Settlo Tech Solutions</div>
            <div class="company-address">
              121AkhilPlaza PerunduraiRoadErode<br>
              <a href="https://www.settlo.com" class="company-website">www.settlo.com</a>, +91 9003633356
            </div>
          </div>
          
          <div class="invoice-details">
            <div class="invoice-number">INVOICE # ${invoice.invoiceNumber}</div>
            <div class="invoice-date">
              Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}<br>
              ${invoice.paymentType === 'Initial Payment' && invoice.dueDate ? 
                `Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}` : ''
              }
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

        <div class="highlight-box">
          <div class="payment-status">
            ${invoice.paymentType === 'Full Payment' ? 
              '✅ FULL PAYMENT - PAID' : 
              `⏳ INITIAL PAYMENT - ${pendingAmount > 0 ? 'PENDING BALANCE' : 'COMPLETED'}`
            }
          </div>
        </div>

        <table class="services-table">
          <thead>
            <tr>
              <th style="width: 25%;">Service</th>
              <th style="width: 50%;">Description</th>
              <th style="width: 25%;">Amount</th>
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
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="payment-summary">
          <div class="summary-row">
            <span class="summary-label">Amount Collected</span>
            <span class="summary-value collected-amount">₹${collectedAmount.toFixed(2)}</span>
          </div>
          ${pendingAmount > 0 ? `
            <div class="summary-row">
              <span class="summary-label">Pending Amount</span>
              <span class="summary-value pending-amount">₹${pendingAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${invoice.taxPercentage > 0 ? `
            <div class="summary-row">
              <span class="summary-label">Tax (${invoice.taxPercentage}%)</span>
              <span class="summary-value">₹${(totalProjectValue * (invoice.taxPercentage / 100)).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="summary-row total-row">
            <span>Total Project Value</span>
            <span>₹${totalProjectValue.toFixed(2)}</span>
          </div>
        </div>

        ${invoice.notes ? `
          <div class="notes-section" style="margin: 25px 0; padding: 15px; background: #f9f9f9; border-radius: 5px;">
            <strong>Notes:</strong><br>
            ${invoice.notes.replace(/\n/g, '<br>')}
          </div>
        ` : ''}

        <div class="footer">
          <div class="footer-content">
            <strong>Thank you for choosing Settlo Tech Solutions!</strong><br>
            Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}<br>
            For support: +91 9003633356 | <a href="https://www.settlo.com" class="company-website">www.settlo.com</a>
          </div>
          <div class="footer-signature">
            ${signatureBase64 ? 
              `<img src="${signatureBase64}" alt="Signature" class="signature-image"/>` :
              `<div class="placeholder-signature">SIGNATURE</div>`
            }
            <div class="signature-text">Settlo Team Manager</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

module.exports = { generateInvoicePDF };
