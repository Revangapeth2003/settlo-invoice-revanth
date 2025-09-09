const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');

// ✅ REMOTE IMAGE URLs from S3 bucket (same as React Native)
const REMOTE_IMAGES = {
  'logo.png': 'https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/logo.png',
  'signature.png': 'https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/signature.png',
};

const generateInvoicePDF = async (invoiceData) => {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    const htmlContent = await generateSettloInvoiceHTML(invoiceData);
    
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

// ✅ UPDATED: Download remote image from S3 and convert to base64 (Backend version)
const getRemoteImageBase64 = async (imageName) => {
  try {
    const imageUrl = REMOTE_IMAGES[imageName];
    
    if (!imageUrl) {
      console.warn(`❌ No URL configured for ${imageName}`);
      return generateFallbackSVG(imageName);
    }
    
    console.log(`📥 Downloading ${imageName} from S3: ${imageUrl}`);
    
    return new Promise((resolve, reject) => {
      https.get(imageUrl, {
        headers: {
          'User-Agent': 'Settlo-Invoice-App/1.0',
          'Accept': 'image/*',
        }
      }, (response) => {
        if (response.statusCode !== 200) {
          console.warn(`❌ Download failed with status: ${response.statusCode}`);
          resolve(generateFallbackSVG(imageName));
          return;
        }
        
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const extension = imageName.split('.').pop()?.toLowerCase() || 'png';
          const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'jpeg' : 'png';
          
          console.log(`✅ ${imageName} downloaded successfully from S3`);
          resolve(`data:image/${mimeType};base64,${buffer.toString('base64')}`);
        });
      }).on('error', (error) => {
        console.warn(`⚠️ Failed to download ${imageName} from S3:`, error.message);
        resolve(generateFallbackSVG(imageName));
      });
    });
  } catch (error) {
    console.warn(`⚠️ Failed to download ${imageName} from S3:`, error.message);
    return generateFallbackSVG(imageName);
  }
};

// Enhanced fallback SVG with different icons for logo vs signature (same as React Native)
const generateFallbackSVG = (imageName) => {
  if (imageName.includes('signature')) {
    return 'data:image/svg+xml;base64,' + Buffer.from(`
      <svg width="150" height="75" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="75" fill="#f8f9fa" stroke="#ddd" stroke-width="1"/>
        <text x="75" y="35" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">Authorized</text>
        <text x="75" y="55" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">Signature</text>
      </svg>
    `).toString('base64');
  } else {
    return 'data:image/svg+xml;base64,' + Buffer.from(`
      <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="50" fill="#2E3B82"/>
        <text x="60" y="75" font-family="Arial" font-size="36" fill="white" text-anchor="middle">S</text>
      </svg>
    `).toString('base64');
  }
};

// ✅ UPDATED: Generate Settlo Invoice HTML with S3 remote images and Account Details
const generateSettloInvoiceHTML = async (invoiceData) => {
  // Download images from S3 URLs
  console.log('📥 Downloading remote images from S3 for PDF...');
  const logoBase64 = await getRemoteImageBase64('logo.png');
  const signatureBase64 = await getRemoteImageBase64('signature.png');
  console.log('✅ S3 images processed for PDF');

  // Calculate amounts correctly (same logic as React Native)
  const calculateAmounts = () => {
    if (invoiceData.paymentType === 'Full Payment') {
      return {
        collectedAmount: invoiceData.totalAmount || invoiceData.total,
        pendingAmount: 0,
        totalProjectValue: invoiceData.totalAmount || invoiceData.total
      };
    } else {
      let totalItemAmount = 0;
      let totalPendingAmount = 0;
      
      (invoiceData.items || []).forEach(item => {
        const itemTotal = parseFloat(item.rate || 0) * parseFloat(item.quantity || 1);
        const itemPending = parseFloat(item.pendingPayment || 0);
        
        totalItemAmount += itemTotal;
        totalPendingAmount += itemPending;
      });
      
      return {
        collectedAmount: totalItemAmount - totalPendingAmount,
        pendingAmount: totalPendingAmount,
        totalProjectValue: totalItemAmount
      };
    }
  };

  const { collectedAmount, pendingAmount, totalProjectValue } = calculateAmounts();
  
  console.log('💰 PDF Amount Calculations:', {
    paymentType: invoiceData.paymentType,
    invoiceTotal: invoiceData.totalAmount || invoiceData.total,
    collectedAmount,
    pendingAmount,
    totalProjectValue
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceData.invoiceNumber}</title>
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
          }
          .account-details {
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
          .invoice-logo {
            flex: 0 0 200px;
            text-align: center;
          }
          .settlo-logo {
            width: 120px;
            height: 120px;
            margin: 0 auto 10px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
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
            color: ${invoiceData.paymentType === 'Full Payment' ? '#4CAF50' : '#FF9800'};
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
        <div class="invoice-header">
          <div class="company-info">
            <div class="company-name">Settlo Academy &</div>
            <div class="company-tagline">Settlo Tech Solutions</div>
            <div class="company-address">
              121AkhilPlaza PerunduraiRoadErode<br>
              <a href="https://www.settlo.com" class="company-website">www.settlo.com</a>, +91 9003633356
            </div>
            
            <!-- ✅ NEW: Account Details Section -->
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
          
          <div class="invoice-logo">
            <img src="${logoBase64}" alt="Settlo Logo" class="settlo-logo">
            <div class="invoice-details">
              <div class="invoice-number">INVOICE # ${invoiceData.invoiceNumber}</div>
              <div class="invoice-date">
                Invoice Date: ${new Date(invoiceData.invoiceDate || invoiceData.date).toLocaleDateString('en-IN')}<br>
                ${invoiceData.paymentType === 'Initial Payment' && invoiceData.dueDate ? 
                  `Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString('en-IN')}` : ''
                }
              </div>
            </div>
          </div>
        </div>

        <div class="client-section">
          <div class="section-title">Bill To:</div>
          <div class="client-details">
            <strong>${invoiceData.clientName}</strong><br>
            Phone: ${invoiceData.clientPhone}<br>
            ${invoiceData.clientEmail ? `Email: ${invoiceData.clientEmail}<br>` : ''}
            ${invoiceData.clientAddress ? invoiceData.clientAddress.replace(/\n/g, '<br>') : ''}
          </div>
        </div>

        <!-- Payment Status Banner -->
        <div class="highlight-box">
          <div class="payment-status">
            ${invoiceData.paymentType === 'Full Payment' ? 
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
            ${(invoiceData.items || []).map(item => {
              const itemRate = parseFloat(item.rate || 0);
              const itemQty = parseFloat(item.quantity || 1);
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

        <!-- Payment Summary -->
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
          ${(invoiceData.taxPercentage || invoiceData.tax) > 0 ? `
            <div class="summary-row">
              <span class="summary-label">Tax (${invoiceData.taxPercentage || invoiceData.tax}%)</span>
              <span class="summary-value">₹${(totalProjectValue * (parseFloat(invoiceData.taxPercentage || invoiceData.tax) / 100)).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="summary-row total-row">
            <span>Total Project Value</span>
            <span>₹${totalProjectValue.toFixed(2)}</span>
          </div>
        </div>

        ${invoiceData.notes ? `
          <div class="notes-section">
            <strong>Notes:</strong><br>
            ${invoiceData.notes.replace(/\n/g, '<br>')}
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

// ✅ Generate balance paid PDF (same as React Native)
const generateBalancePaidPDF = async (invoiceData) => {
  const htmlContent = await generateBalancePaidHTML(invoiceData);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
    
    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
};

// ✅ Generate balance paid HTML (same as React Native)
const generateBalancePaidHTML = async (invoice) => {
  const logoBase64 = await getRemoteImageBase64('logo.png');
  const signatureBase64 = await getRemoteImageBase64('signature.png');
  const currentDate = new Date().toLocaleDateString('en-IN');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber} - Balance Paid</title>
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
          }
          .account-details {
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
          .invoice-logo {
            flex: 0 0 200px;
            text-align: center;
          }
          .settlo-logo {
            width: 120px;
            height: 120px;
            margin: 0 auto 10px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
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
          .company-website {
            color: #2E3B82;
            text-decoration: none;
            font-weight: bold;
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
          .paid-status-banner {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            text-align: center;
            padding: 15px 20px;
            border-radius: 10px;
            margin: 20px 0;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }
          .paid-status-text {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .paid-status-subtext {
            font-size: 12px;
            opacity: 0.9;
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
            background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
            border: 3px solid #4CAF50;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            box-shadow: 0 6px 12px rgba(76, 175, 80, 0.2);
          }
          .payment-summary-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            color: #2E7D32;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(76, 175, 80, 0.3);
          }
          .payment-row:last-child {
            border-bottom: 3px solid #4CAF50;
            font-weight: bold;
            font-size: 16px;
            margin-top: 15px;
            padding-top: 15px;
            background: rgba(76, 175, 80, 0.1);
            border-radius: 8px;
            padding-left: 10px;
            padding-right: 10px;
          }
          .payment-label {
            font-weight: 600;
            color: #2E7D32;
          }
          .payment-amount {
            font-weight: bold;
          }
          .initial-payment {
            color: #1976D2;
          }
          .balance-payment {
            color: #F57C00;
          }
          .total-payment {
            color: #2E7D32;
          }
          .notes-section {
            margin-top: 20px; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 8px; 
            border-left: 4px solid #2196F3;
            font-size: 12px;
          }
          .footer {
            margin-top: 50px;
            border-top: 2px solid #eee;
            padding-top: 30px;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 20px 0;
          }
          .signature-left {
            flex: 0 0 auto;
            margin-right: 20px;
          }
          .signature-image {
            width: 120px;
            height: 60px;
            border-radius: 5px;
            border: 1px solid #ddd;
          }
          .signature-right {
            flex: 1;
            text-align: right;
          }
          .thank-you-text {
            color: #666;
            font-size: 11px;
            line-height: 1.4;
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div class="company-info">
            <div class="company-name">Settlo Academy &</div>
            <div class="company-tagline">Settlo Tech Solutions</div>
            <div class="company-address">
              121AkhilPlaza PerunduraiRoadErode<br>
              <a href="https://www.settlo.com" class="company-website">www.settlo.com</a>, +91 9003633356
            </div>
            
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
          
          <div class="invoice-logo">
            <img src="${logoBase64}" alt="Settlo Logo" class="settlo-logo">
            <div class="invoice-details">
              <div class="invoice-number">INVOICE # ${invoice.invoiceNumber}</div>
              <div class="invoice-date">
                Invoice Date: ${new Date(invoice.date || invoice.invoiceDate).toLocaleDateString('en-IN')}<br>
                Updated: ${currentDate}<br>
                <strong style="color: #4CAF50;">STATUS: PAID IN FULL</strong>
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

        <div class="paid-status-banner">
          <div class="paid-status-text">✅ PAYMENT COMPLETED - INVOICE FULLY SETTLED</div>
          <div class="paid-status-subtext">All payment obligations have been completed • No outstanding balance</div>
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
            ${(invoice.items || []).map(item => {
              const itemRate = parseFloat(item.rate || 0);
              const itemQty = parseFloat(item.quantity || 1);
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
          <div class="payment-summary-title">Payment Summary - Completed</div>
          
          <div class="payment-row">
            <span class="payment-label">Initial Payment Collected:</span>
            <span class="payment-amount initial-payment">₹${invoice.initialPaymentCollected.toFixed(2)}</span>
          </div>
          
          <div class="payment-row">
            <span class="payment-label">Balance Amount Paid:</span>
            <span class="payment-amount balance-payment">₹${invoice.balanceAmountPaid.toFixed(2)}</span>
          </div>
          
          ${invoice.tax > 0 ? `
            <div class="payment-row">
              <span class="payment-label">Tax (${invoice.tax}%):</span>
              <span class="payment-amount">₹${((invoice.totalAmountPaid * invoice.tax) / 100).toFixed(2)}</span>
            </div>
          ` : ''}
          
          <div class="payment-row">
            <span class="payment-label">TOTAL AMOUNT PAID:</span>
            <span class="payment-amount total-payment">₹${invoice.totalAmountPaid.toFixed(2)}</span>
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
                Invoice marked as paid on ${currentDate}<br>
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

// Export functions
module.exports = { 
  generateInvoicePDF,
  generateBalancePaidPDF,
  getRemoteImageBase64,
  generateSettloInvoiceHTML
};
