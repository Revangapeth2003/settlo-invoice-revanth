import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Plus, 
  FileText, 
  BarChart3, 
  Settings, 
  HelpCircle,
  Zap
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Create Invoice', href: '/create', icon: Plus },
    { name: 'Invoice History', href: '/history', icon: FileText },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  const secondaryNavigation = [
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Help & Support', href: '/help', icon: HelpCircle },
  ];

  return (
    <motion.div 
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 shadow-soft pt-16"
    >
      <div className="flex flex-col h-full">
        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <div className="mb-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 rounded-xl text-white"
            >
              <div className="flex items-center space-x-3">
                <Zap className="w-6 h-6" />
                <div>
                  <h3 className="font-semibold">Quick Actions</h3>
                  <p className="text-xs opacity-90">Create invoice in seconds</p>
                </div>
              </div>
            </motion.div>
          </div>

          {navigation.map((item, index) => {
            const isActive = location.pathname === item.href || 
              (item.href === '/dashboard' && location.pathname === '/');
            
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
              >
                <NavLink
                  to={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                    }
                  `}
                >
                  <item.icon className={`
                    mr-3 h-5 w-5 transition-colors duration-200
                    ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-500'}
                  `} />
                  {item.name}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-2 h-2 bg-primary-600 rounded-full"
                    />
                  )}
                </NavLink>
              </motion.div>
            );
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className="border-t border-gray-200 px-4 py-4 space-y-2">
          {secondaryNavigation.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (0.1 * index) }}
            >
              <NavLink
                to={item.href}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-primary-600 transition-all duration-200 group"
              >
                <item.icon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors duration-200" />
                {item.name}
              </NavLink>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="border-t border-gray-200 p-4"
        >
          <div className="text-center text-xs text-gray-500">
            <p>© 2024 Settlo Tech Solutions</p>
            <p>Version 1.0.0</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
