import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number; // ms, default 3000
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose, duration = 3000 }) => {
  // Auto-dismiss
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [isVisible, duration, onClose]);

  const config = {
    success: { icon: <CheckCircle2 size={16} />, className: 'bg-green-500/20 border-green-500/40 text-green-300' },
    error:   { icon: <XCircle    size={16} />, className: 'bg-red-500/20   border-red-500/40   text-red-300'   },
    info:    { icon: <Info       size={16} />, className: 'bg-blue-500/20  border-blue-500/40  text-blue-300'  },
  }[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit ={{ opacity: 0, y: 20,  scale: 0.9, transition: { duration: 0.15 } }}
          className={`fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 
            flex items-center gap-2.5 px-5 py-3 rounded-full border backdrop-blur-md shadow-xl
            ${config.className}`}
        >
          {config.icon}
          <span className="font-medium text-sm whitespace-nowrap">{message}</span>
          <button onClick={onClose} className="ml-1 hover:opacity-70 transition-opacity">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
