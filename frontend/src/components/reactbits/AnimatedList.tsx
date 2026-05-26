import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const AnimatedList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const items = React.Children.toArray(children);
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <AnimatePresence>
        {items.map((child, i) => (
          <motion.div
            key={(child as React.ReactElement).key || i}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            layout
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
