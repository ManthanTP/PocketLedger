import React from 'react';

interface AppIconProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

/**
 * 1. Full-color icon on dark navy background (#0B1220) with exact APK P-logo layout.
 * Matches the official PocketLedger Android APK launcher icon.
 */
export const AppIconFull: React.FC<AppIconProps> = ({ size = 512, className = '', showText = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-[22%] shadow-xl ${className}`}
      style={{ background: '#0B1220' }}
      aria-label="PocketLedger Logo"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Stylized Geometric P Logo Mark with glowing chart-arrow matching APK */}
      <g
        transform={showText ? 'translate(64, 36) scale(0.75)' : 'translate(85.3, 85.3) scale(0.667)'}
        filter="url(#glow)"
      >
        {/* Loop & Stem of the P */}
        <path
          d="M 185 150 H 290 C 330 150 360 180 360 220 C 360 260 330 290 290 290 H 185 V 360"
          stroke="url(#logo-gradient)"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Zigzag Chart Line ending in Arrow */}
        <path
          d="M 185 340 L 255 260 L 305 310 L 395 220"
          stroke="url(#logo-gradient)"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Arrow Head */}
        <path
          d="M 335 220 H 395 V 280"
          stroke="url(#logo-gradient)"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Optional Wordmark matching APK (only rendered if explicitly requested) */}
      {showText && (
        <text
          x="256"
          y="445"
          fill="#FFFFFF"
          fontFamily="'Segoe UI', Roboto, sans-serif"
          fontWeight="bold"
          fontSize="44"
          letterSpacing="-0.5"
          textAnchor="middle"
        >
          PocketLedger
        </text>
      )}
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
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PocketLedger Notification Icon"
    >
      <g transform="translate(85.3, 85.3) scale(0.667)">
        <path
          d="M 185 150 H 290 C 330 150 360 180 360 220 C 360 260 330 290 290 290 H 185 V 360"
          stroke="#FFFFFF"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M 185 340 L 255 260 L 305 310 L 395 220"
          stroke="#FFFFFF"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M 335 220 H 395 V 280"
          stroke="#FFFFFF"
          strokeWidth="34"
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
      aria-label="PocketLedger Adaptive Icon Foreground"
    >
      <defs>
        <linearGradient id="adaptive-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      <g transform="translate(85.3, 85.3) scale(0.667)">
        <path
          d="M 185 150 H 290 C 330 150 360 180 360 220 C 360 260 330 290 290 290 H 185 V 360"
          stroke="url(#adaptive-gradient)"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M 185 340 L 255 260 L 305 310 L 395 220"
          stroke="url(#adaptive-gradient)"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M 335 220 H 395 V 280"
          stroke="url(#adaptive-gradient)"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
