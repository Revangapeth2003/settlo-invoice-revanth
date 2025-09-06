import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { invoiceAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getAnalytics(period);
      
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
    toast.success('Analytics refreshed!');
  };

  const exportData = () => {
    if (!analytics) return;
    
    const csvContent = generateCSVContent(analytics);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settlo-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Analytics data exported!');
  };

  const generateCSVContent = (data) => {
    let csv = 'Settlo Analytics Report\n\n';
    
    csv += 'SUMMARY\n';
    csv += 'Metric,Value\n';
    csv += `Total Invoices,${data.totalInvoices}\n`;
    csv += `Total Revenue,Rs.${data.totalRevenue.toFixed(2)}\n`;
    csv += `Collected Amount,Rs.${data.collectedAmount.toFixed(2)}\n`;
    csv += `Pending Amount,Rs.${data.pendingAmount.toFixed(2)}\n`;
    csv += `Collection Rate,${((data.collectedAmount / data.totalRevenue) * 100).toFixed(2)}%\n\n`;
    
    csv += 'SERVICE TYPES\n';
    csv += 'Type,Count\n';
    Object.entries(data.serviceTypes).forEach(([type, count]) => {
      csv += `${type},${count}\n`;
    });
    
    return csv;
  };

  // Chart configurations
  const revenueChartData = {
    labels: analytics ? Object.keys(analytics.monthlyData) : [],
    datasets: [
      {
        label: 'Total Revenue',
        data: analytics ? Object.values(analytics.monthlyData).map(m => m.revenue) : [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Collected Amount',
        data: analytics ? Object.values(analytics.monthlyData).map(m => m.collected) : [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      }
    ],
  };

  const serviceTypeChartData = {
    labels: ['Settlo Academy', 'Settlo HR', 'Settlo Tech Solutions', 'Settlo Distance Education'],
    datasets: [
      {
        data: analytics ? [
          analytics.serviceTypes.SA,
          analytics.serviceTypes.SHR,
          analytics.serviceTypes.STS,
          analytics.serviceTypes.SDE,
        ] : [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(147, 51, 234)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" message="Loading analytics..." />
      </div>
    );
  }

  const collectionRate = analytics ? (analytics.collectedAmount / analytics.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive business insights and performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          
          <button
            onClick={exportData}
            className="flex items-center space-x-2 px-4 py-2 gradient-primary text-white rounded-lg hover:shadow-lg transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>
      </motion.div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Total Revenue',
                value: `₹${analytics.totalRevenue.toLocaleString()}`,
                change: '+12.5%',
                icon: DollarSign,
                color: 'from-blue-500 to-blue-600',
              },
              {
                title: 'Collected Amount',
                value: `₹${analytics.collectedAmount.toLocaleString()}`,
                change: `${collectionRate.toFixed(1)}%`,
                icon: TrendingUp,
                color: 'from-green-500 to-green-600',
              },
              {
                title: 'Active Invoices',
                value: analytics.totalInvoices.toString(),
                change: '+8.2%',
                icon: BarChart3,
                color: 'from-purple-500 to-purple-600',
              },
              {
                title: 'Collection Rate',
                value: `${collectionRate.toFixed(1)}%`,
                change: '+5.1%',
                icon: PieChart,
                color: 'from-orange-500 to-orange-600',
              },
            ].map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-6 hover-lift"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm font-medium">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
                    <p className="text-sm text-green-600 mt-2">{metric.change} from last period</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.color} text-white`}>
                    <metric.icon className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
                <LineChart className="w-5 h-5 text-primary-600" />
              </div>
              <div className="chart-container">
                <Line data={revenueChartData} options={chartOptions} />
              </div>
            </motion.div>

            {/* Service Type Distribution */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Service Distribution</h3>
                <PieChart className="w-5 h-5 text-primary-600" />
              </div>
              <div className="chart-container">
                <Pie data={serviceTypeChartData} options={{ responsive: true }} />
              </div>
            </motion.div>
          </div>

          {/* Detailed Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Payment Status Breakdown */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Paid Invoices</span>
                  </div>
                  <span className="font-semibold text-green-700">{analytics.paidCount}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Pending Invoices</span>
                  </div>
                  <span className="font-semibold text-yellow-700">{analytics.pendingCount}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Overdue Invoices</span>
                  </div>
                  <span className="font-semibold text-red-700">{analytics.overdueCount || 0}</span>
                </div>
              </div>
            </div>

            {/* Service Performance */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Service Performance</h3>
              <div className="space-y-4">
                {[
                  { name: 'Settlo Academy', type: 'SA', count: analytics.serviceTypes.SA, color: 'bg-blue-500' },
                  { name: 'Settlo HR', type: 'SHR', count: analytics.serviceTypes.SHR, color: 'bg-purple-500' },
                  { name: 'Settlo Tech Solutions', type: 'STS', count: analytics.serviceTypes.STS, color: 'bg-green-500' },
                  { name: 'Settlo Distance Education', type: 'SDE', count: analytics.serviceTypes.SDE, color: 'bg-orange-500' },
                ].map((service) => (
                  <div key={service.type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 ${service.color} rounded`}></div>
                      <span className="text-sm font-medium text-gray-700">{service.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{service.count} invoices</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 ${service.color} rounded-full`}
                          style={{ width: `${(service.count / analytics.totalInvoices) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Analytics;
