import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
  showGlow?: boolean;
}

export default function AppLogo({ className = '', size = 40, showGlow = true }: AppLogoProps) {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {showGlow && (
        <div 
          className="absolute inset-0 rounded-2xl bg-[#D4FF00] opacity-30 blur-md pointer-events-none"
        />
      )}

      {/* Main Rounded Badge Container in Carbon & Acid Volt */}
      <div 
        className="relative w-full h-full rounded-2xl bg-[#121215] border border-[#D4FF00]/50 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(212,255,0,0.2)]"
      >
        {/* Kinetic Energy Laboratory Flask SVG Icon */}
        <svg 
          viewBox="0 0 64 64" 
          className="w-3/4 h-3/4 transform -rotate-12 filter drop-shadow-md"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fluid Level in Acid Volt & Blaze Orange */}
          <path 
            d="M 24 34 Q 32 37 40 34 L 40 50 C 40 54 36 57 32 57 C 28 57 24 54 24 50 Z" 
            fill="#D4FF00" 
            opacity="0.95"
          />
          {/* Flask Contours */}
          <path 
            d="M 22 12 L 42 12 M 25 12 L 25 48 C 25 53 28 56 32 56 C 36 56 39 53 39 48 L 39 12" 
            stroke="#FFFFFF" 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Top Lip */}
          <path 
            d="M 21 12 C 21 10.5 22.5 9.5 24 9.5 L 40 9.5 C 41.5 9.5 43 10.5 43 12" 
            stroke="#FFFFFF" 
            strokeWidth="4" 
            strokeLinecap="round" 
          />
          {/* Measurement Tick Lines in Blaze Orange */}
          <line x1="39" y1="22" x2="33" y2="22" stroke="#FF5500" strokeWidth="3" strokeLinecap="round" />
          <line x1="39" y1="28" x2="35" y2="28" stroke="#FF5500" strokeWidth="3" strokeLinecap="round" />
          <line x1="39" y1="34" x2="33" y2="34" stroke="#FF5500" strokeWidth="3" strokeLinecap="round" />
          <line x1="39" y1="40" x2="35" y2="40" stroke="#FF5500" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
