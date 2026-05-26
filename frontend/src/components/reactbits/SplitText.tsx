import React from 'react';
import { motion } from 'framer-motion';

interface SplitTextProps {
  text: string;
  className?: string;
}

export const SplitText: React.FC<SplitTextProps> = ({ text, className = '' }) => (
  <span className={className}>
    {text.split('').map((char, i) => (
      <motion.span
        key={`${char}-${i}`}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: i * 0.03, duration: 0.4 }}
        className="inline-block"
      >
        {char === ' ' ? '\u00A0' : char}
      </motion.span>
    ))}
  </span>
);
