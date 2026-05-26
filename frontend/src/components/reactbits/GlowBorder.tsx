import React from 'react';

export const GlowBorder: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`relative p-[1px] rounded-xl overflow-hidden group ${className}`}>
      {/* Animated glowing gradient border */}
      <div className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#6366f1_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative h-full w-full bg-surface-900 rounded-xl overflow-hidden z-10">
        {children}
      </div>
    </div>
  );
};
