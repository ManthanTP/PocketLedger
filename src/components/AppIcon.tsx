import React from 'react';

interface AppIconProps {
  size?: number;
  className?: string;
}

/**
 * 1. Full-color icon on dark navy background (#0B1220) with exact P-logo layout
 * Suitable for Splash Screen, App Store, and launcher preview.
 */
export const AppIconFull: React.FC<AppIconProps> = ({ size = 512, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-[100px] shadow-2xl ${className}`}
      style={{ background: '#0B1220' }}
      aria-label="Pocket Ledger Logo"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Stylized Geometric P Logo Mark with glowing chart-arrow */}
      <g filter="url(#glow)">
        {/* Loop & Stem of the P */}
        <path
          d="M 185 150 H 290 C 330 150 360 180 360 220 C 360 260 330 290 290 290 H 185 V 360"
          stroke="url(#logo-gradient)"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Zigzag Chart Line ending in Arrow */}
        <path
          d="M 185 340 L 255 260 L 305 310 L 395 220"
          stroke="url(#logo-gradient)"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Arrow Head */}
        <path
          d="M 335 220 H 395 V 280"
          stroke="url(#logo-gradient)"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Mixed case App Name Wordmark */}
      <text
        x="256"
        y="440"
        fill="#FFFFFF"
        fontFamily="'Space Grotesk', sans-serif"
        fontWeight="bold"
        fontSize="46"
        letterSpacing="-0.5"
        textAnchor="middle"
      >
        Pocket Ledger
      </text>
    </svg>
  );
};

/**
 * 2. Monochrome white silhouette version, transparent background
 * Suitable for Android notification tray icon.
 */
export const AppIconMonochrome: React.FC<AppIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Pocket Ledger Notification Icon"
    >
      <g transform="translate(1, 1) scale(0.19)">
        <path
          d="M 185 150 H 290 C 330 150 360 180 360 220 C 360 260 330 290 290 290 H 185 V 360"
          stroke="#FFFFFF"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M 185 340 L 255 260 L 305 310 L 395 220"
          stroke="#FFFFFF"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M 335 220 H 395 V 280"
          stroke="#FFFFFF"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

/**
 * 3. Adaptive Icon Foreground Layer (Transparent background, safe zone respected)
 * Designed for Android 8+ Adaptive Icons.
 */
export const AppIconAdaptiveForeground: React.FC<AppIconProps> = ({ size = 512, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Pocket Ledger Adaptive Icon Foreground"
    >
      {/* Gradients */}
      <defs>
        <linearGradient id="adaptive-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      <g transform="translate(38.4, 38.4) scale(0.85)">
        <path
          d="M 185 150 H 290 C 330 150 360 180 360 220 C 360 260 330 290 290 290 H 185 V 360"
          stroke="url(#adaptive-gradient)"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M 185 340 L 255 260 L 305 310 L 395 220"
          stroke="url(#adaptive-gradient)"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M 335 220 H 395 V 280"
          stroke="url(#adaptive-gradient)"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
