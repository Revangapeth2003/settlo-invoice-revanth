import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Search, User, Settings, LogOut } from 'lucide-react';

const Navbar = () => {
  return (
    <motion.nav 
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-soft"
    >
      <div className="px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center space-x-3"
        >
          <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settlo Invoice</h1>
            <p className="text-xs text-gray-500">Professional Invoice Management</p>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="hidden md:flex items-center space-x-4 flex-1 max-w-md mx-8"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search invoices, clients..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </motion.div>

        {/* Right Actions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center space-x-3"
        >
          <button className="relative p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-all duration-200">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="hidden sm:flex items-center space-x-3 pl-3 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Admin User</p>
              <p className="text-xs text-gray-500">admin@settlo.com</p>
            </div>
            <div className="relative group">
              <button className="w-9 h-9 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium hover:from-primary-600 hover:to-primary-700 transition-all duration-200">
                <User className="w-4 h-4" />
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-medium border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-2">
                  <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150">
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </a>
                  <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150">
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign out
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
