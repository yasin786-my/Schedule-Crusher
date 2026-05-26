import React from 'react';

interface AuroraProps {
  colorStops?: string[];
  speed?: number;
  blend?: number;
  className?: string;
}

export const Aurora: React.FC<AuroraProps> = ({
  colorStops = ["#3A29FF", "#FF94B4", "#FF3232"],
  speed = 0.5,
  className = ""
}) => {
  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#020617] ${className}`}>
      {/* Simplified CSS-based Aurora for performance without heavy WebGL deps */}
      <div 
        className="absolute inset-0 opacity-50 blur-[100px]"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${colorStops[0]} 0%, transparent 50%),
                       radial-gradient(circle at 80% 20%, ${colorStops[1]} 0%, transparent 40%),
                       radial-gradient(circle at 20% 80%, ${colorStops[2]} 0%, transparent 40%)`,
          animation: `spin ${10 / speed}s linear infinite`,
        }}
      />
      <div 
        className="absolute inset-0 opacity-40 blur-[120px]"
        style={{
          background: `radial-gradient(circle at 20% 20%, ${colorStops[1]} 0%, transparent 50%),
                       radial-gradient(circle at 80% 80%, ${colorStops[0]} 0%, transparent 50%)`,
          animation: `spin ${15 / speed}s linear infinite reverse`,
        }}
      />
      
      {/* Custom keyframes injected safely */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `}</style>
    </div>
  );
};
