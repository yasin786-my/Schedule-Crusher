import React from 'react';
import { motion } from 'framer-motion';

export const TiltedCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, rotateX: 5, rotateY: 5 }}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-shadow hover:shadow-[0_20px_40px_rgba(99,102,241,0.3)] ${className}`}
      style={{ perspective: 1000 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
};
