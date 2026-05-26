import React from 'react';
import { motion } from 'framer-motion';

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
}

export const BlurText: React.FC<BlurTextProps> = ({ 
  text, 
  delay = 50, 
  className = "", 
  animateBy = 'words' 
}) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: delay / 1000,
      }
    }
  };

  const item = {
    hidden: { filter: 'blur(10px)', opacity: 0, y: 10 },
    show: { filter: 'blur(0px)', opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className={`inline-flex flex-wrap ${className}`}
    >
      {elements.map((element, i) => (
        <motion.span 
          key={i} 
          variants={item}
          className={animateBy === 'words' ? 'mr-1' : ''}
        >
          {element === ' ' ? '\u00A0' : element}
        </motion.span>
      ))}
    </motion.div>
  );
};
