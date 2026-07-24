import React from 'react';

export default function AppLogo({ className = '', size = 40, showGlow = true }) {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Subtle outer glow effect matching Image 1 */}
      {showGlow && (
        <div 
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#00c9a7] via-[#0d9488] to-[#06b6d4] opacity-50 blur-md pointer-events-none"
        />
      )}

      {/* Main Rounded Badge Container */}
      <div 
        className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#00d2b4] via-[#00c9a7] to-[#0a9396] border border-[#5eead4]/40 flex items-center justify-center overflow-hidden shadow-lg"
      >
        {/* Laboratory Test Tube / Flask SVG Icon (Matches Image 1) */}
        <svg 
          viewBox="0 0 64 64" 
          className="w-3/4 h-3/4 transform -rotate-12 filter drop-shadow-md"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Liquid Level inside test tube */}
          <path 
            d="M 24 34 Q 32 37 40 34 L 40 50 C 40 54 36 57 32 57 C 28 57 24 54 24 50 Z" 
            fill="#5eead4" 
            opacity="0.9"
          />
          {/* Flask / Test Tube Outline */}
          <path 
            d="M 22 12 L 42 12 M 25 12 L 25 48 C 25 53 28 56 32 56 C 36 56 39 53 39 48 L 39 12" 
            stroke="#070a13" 
            strokeWidth="4.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Lip / Rim of Test Tube */}
          <path 
            d="M 21 12 C 21 10.5 22.5 9.5 24 9.5 L 40 9.5 C 41.5 9.5 43 10.5 43 12" 
            stroke="#070a13" 
            strokeWidth="4.5" 
            strokeLinecap="round" 
          />
          {/* Measurement Hash Marks */}
          <line x1="39" y1="22" x2="33" y2="22" stroke="#070a13" strokeWidth="3" strokeLinecap="round" />
          <line x1="39" y1="28" x2="35" y2="28" stroke="#070a13" strokeWidth="3" strokeLinecap="round" />
          <line x1="39" y1="34" x2="33" y2="34" stroke="#070a13" strokeWidth="3" strokeLinecap="round" />
          <line x1="39" y1="40" x2="35" y2="40" stroke="#070a13" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
