import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 24,
    md: 40,
    lg: 64,
  };

  const s = sizeMap[size];
  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 3.5 : 4;
  const radius = (s - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Glow effect */}
      <div
        className="absolute rounded-full animate-pulse-slow"
        style={{
          width: s + 16,
          height: s + 16,
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
        }}
      />

      {/* Outer ring */}
      <motion.svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke="rgba(99, 102, 241, 0.15)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke="url(#spinner-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.7}
        />
        <defs>
          <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Inner pulse dot */}
      {size !== 'sm' && (
        <motion.div
          className="absolute rounded-full bg-primary-500"
          style={{ width: 6, height: 6 }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}
