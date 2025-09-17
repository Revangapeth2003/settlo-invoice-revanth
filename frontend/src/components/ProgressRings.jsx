import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const ProgressRings = ({ data, size = 140 }) => {
  const [animationComplete, setAnimationComplete] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const paidPercentage = total > 0 ? (data[0]?.value / total) * 100 : 0;
  const pendingPercentage = total > 0 ? (data[1]?.value / total) * 100 : 0;
  const overduePercentage = total > 0 ? (data[2]?.value / total) * 100 : 0;

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;

  const createPath = (percentage, offset = 0) => {
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -offset * circumference / 100;
    return { strokeDasharray, strokeDashoffset };
  };

  return (
    <motion.div 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* SVG Rings */}
      <svg
        width={size}
        height={size}
        className="absolute transform -rotate-90"
      >
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(243 244 246)"
          strokeWidth="8"
          fill="transparent"
        />
        
        {/* Paid Ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(16 185 129)"
          strokeWidth="8"
          fill="transparent"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: paidPercentage / 100 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          {...createPath(paidPercentage)}
        />
        
        {/* Pending Ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius - 15}
          stroke="rgb(245 158 11)"
          strokeWidth="6"
          fill="transparent"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: pendingPercentage / 100 }}
          transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
          {...createPath(pendingPercentage)}
        />
        
        {/* Overdue Ring */}
        {overduePercentage > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 30}
            stroke="rgb(239 68 68)"
            strokeWidth="4"
            fill="transparent"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: overduePercentage / 100 }}
            transition={{ duration: 2, delay: 1, ease: "easeInOut" }}
            {...createPath(overduePercentage)}
          />
        )}
      </svg>

      {/* Center Content */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 2, type: "spring", stiffness: 200 }}
          className="text-3xl font-bold text-gray-900"
        >
          {Math.round(paidPercentage)}%
        </motion.div>
        <div className="text-sm text-gray-500 mt-1">Completed</div>
      </motion.div>
    </motion.div>
  );
};

export default ProgressRings;
