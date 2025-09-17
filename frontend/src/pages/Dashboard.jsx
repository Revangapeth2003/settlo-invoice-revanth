import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Clock, 
  Plus,
  ArrowUpRight,
  Activity,
  Users,
  Calendar
} from 'lucide-react';
import { invoiceAPI } from '../services/api';
import ProgressRings from '../components/ProgressRings';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    collectedAmount: 0,
    pendingAmount: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load analytics and recent invoices in parallel
      const [analyticsResponse, invoicesResponse] = await Promise.all([
        invoiceAPI.getAnalytics('monthly'),
        invoiceAPI.getInvoices({ limit: 5 })
      ]);

      if (analyticsResponse.data.success) {
        setStats(analyticsResponse.data.data);
      }

      if (invoicesResponse.data.success) {
        setRecentInvoices(invoicesResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed!');
  };

  const completionPercentage = stats.totalRevenue > 0 
    ? Math.round((stats.collectedAmount / stats.totalRevenue) * 100) 
    : 0;

  const progressData = [
    { label: 'Paid', value: stats.collectedAmount, color: '#10b981' },
    { label: 'Pending', value: stats.pendingAmount, color: '#f59e0b' },
    { label: 'Overdue', value: stats.overdueAmount || 0, color: '#ef4444' }
  ];

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      change: '+12.5%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'from-blue-500 to-blue-600',
      description: `${stats.totalInvoices} total invoices`
    },
    {
      title: 'Collected Amount',
      value: `₹${stats.collectedAmount.toLocaleString()}`,
      change: `${completionPercentage}%`,
      changeType: 'positive',
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      description: 'of total revenue'
    },
    {
      title: 'Pending Payments',
      value: `₹${stats.pendingAmount.toLocaleString()}`,
      change: `${stats.pendingCount} invoices`,
      changeType: 'neutral',
      icon: Clock,
      color: 'from-yellow-500 to-yellow-600',
      description: 'requiring follow-up'
    },
    {
      title: 'Active Invoices',
      value: stats.totalInvoices.toString(),
      change: '+5.2%',
      changeType: 'positive',
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      description: 'this month'
    }
  ];

  const quickActions = [
    {
      title: 'Create New Invoice',
      description: 'Generate professional invoices quickly',
      icon: Plus,
      color: 'from-primary-500 to-primary-600',
      link: '/create'
    },
    {
      title: 'View All Invoices',
      description: 'Browse complete invoice history',
      icon: FileText,
      color: 'from-green-500 to-green-600',
      link: '/history'
    },
    {
      title: 'Analytics Report',
      description: 'View detailed business insights',
      icon: Activity,
      color: 'from-purple-500 to-purple-600',
      link: '/analytics'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" message="Loading dashboard..." />
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's what's happening with your invoices today.
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
          >
            <Activity className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          
          <Link
            to="/create"
            className="flex items-center space-x-2 px-4 py-2 gradient-primary text-white rounded-lg hover:shadow-lg transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>New Invoice</span>
          </Link>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card p-6 hover-lift hover-glow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} text-white`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 
                stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {stat.change}
              </span>
              {stat.changeType === 'positive' && (
                <ArrowUpRight className="w-4 h-4 ml-1 text-green-600" />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Collection Progress</h3>
              <div className="text-sm text-gray-500">This Month</div>
            </div>
            
            <div className="flex items-center justify-center mb-6">
              <ProgressRings data={progressData} size={160} />
            </div>
            
            <div className="space-y-3">
              {progressData.map((item, index) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                                            className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    ₹{item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent Invoices */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
              <Link 
                to="/history"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
            
            {recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((invoice, index) => (
                  <motion.div
                    key={invoice._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold ${
                        invoice.invoiceType === 'SA' ? 'bg-blue-500' :
                        invoice.invoiceType === 'SHR' ? 'bg-purple-500' :
                        invoice.invoiceType === 'STS' ? 'bg-green-500' : 'bg-orange-500'
                      }`}>
                        {invoice.invoiceType}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-600">{invoice.clientName}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{invoice.totalAmount.toLocaleString()}</p>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No invoices found</p>
                <Link to="/create" className="text-primary-600 hover:text-primary-700 text-sm">
                  Create your first invoice
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Link
                to={action.link}
                className="block card p-6 hover-lift hover-glow group transition-all duration-200"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${action.color} text-white group-hover:shadow-lg transition-shadow duration-200`}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
                      {action.title}
                    </h4>
                    <p className="text-gray-600 text-sm mt-1">{action.description}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors duration-200" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Business Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Insights</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-gray-900">Collection Rate</h4>
            <p className="text-2xl font-bold text-blue-600 mt-1">{completionPercentage}%</p>
            <p className="text-sm text-gray-600">of total revenue</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-gray-900">Avg Invoice Value</h4>
            <p className="text-2xl font-bold text-green-600 mt-1">
              ₹{stats.totalInvoices > 0 ? Math.round(stats.totalRevenue / stats.totalInvoices).toLocaleString() : '0'}
            </p>
            <p className="text-sm text-gray-600">per invoice</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-gray-900">Active Clients</h4>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalInvoices}</p>
            <p className="text-sm text-gray-600">this month</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
