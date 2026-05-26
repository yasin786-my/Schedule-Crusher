import React from 'react';
import { motion } from 'framer-motion';

interface ShinyTextProps {
  text: string;
  className?: string;
}

export const ShinyText: React.FC<ShinyTextProps> = ({ text, className = '' }) => (
  <motion.span
    className={`inline-block bg-gradient-to-r from-primary-300 via-white to-accent-300 bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite] ${className}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    {text}
  </motion.span>
);
