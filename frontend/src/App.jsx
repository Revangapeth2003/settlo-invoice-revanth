import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceHistory from './pages/InvoiceHistory';
import Analytics from './pages/Analytics';
import InvoicePreview from './pages/InvoicePreview';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 pt-16 min-h-screen">
            <div className="p-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/create" element={<CreateInvoice />} />
                <Route path="/history" element={<InvoiceHistory />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/invoice/:invoiceNumber" element={<InvoicePreview />} />
              </Routes>
            </div>
          </main>
        </div>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
