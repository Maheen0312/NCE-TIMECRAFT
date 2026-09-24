import React from 'react';

interface CollegeLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'full' | 'monochrome' | 'white' | 'watermark';
  showText?: boolean;
}

export const CollegeLogo: React.FC<CollegeLogoProps> = ({
  className = '',
  size = 64,
  variant = 'full',
  showText = false,
}) => {
  const isWhite = variant === 'white';
  const isWatermark = variant === 'watermark';
  const isMonochrome = variant === 'monochrome';

  // Base colors
  const primaryBlue = isWhite ? '#ffffff' : isMonochrome ? '#1e293b' : '#002B7F';
  const gold = isWhite ? '#ffffff' : isMonochrome ? '#64748b' : '#D4AF37';
  const flameOrange = isWhite ? '#ffffff' : isMonochrome ? '#94a3b8' : '#FF7A00';
  const flameYellow = isWhite ? '#ffffff' : isMonochrome ? '#cbd5e1' : '#FFD200';
  const atomGrey = isWhite ? 'rgba(255,255,255,0.6)' : isMonochrome ? '#94a3b8' : '#718096';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 select-none ${isWatermark ? 'opacity-10' : ''}`}
      >
        <defs>
          {/* Top text arc path */}
          <path id="top-arc" d="M 45 150 A 105 105 0 0 1 255 150" fill="none" />
          {/* Bottom text arc path */}
          <path id="bottom-arc" d="M 40 160 A 110 110 0 0 0 260 160" fill="none" />

          {/* Lamp Glow Radial Gradient */}
          <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={flameYellow} stopOpacity={isWhite ? '0.9' : '1'} />
            <stop offset="70%" stopColor={flameOrange} stopOpacity={isWhite ? '0.7' : '0.9'} />
            <stop offset="100%" stopColor={gold} stopOpacity="0" />
          </radialGradient>

          {/* Arch Sanctuary Gradient */}
          <linearGradient id="archBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={gold} stopOpacity={isWhite ? '0.2' : '0.25'} />
            <stop offset="100%" stopColor={gold} stopOpacity={isWhite ? '0.4' : '0.45'} />
          </linearGradient>
        </defs>

        {/* Outer Circular Boundary Rings */}
        <circle cx="150" cy="150" r="142" stroke={primaryBlue} strokeWidth="3.5" fill="none" />
        <circle cx="150" cy="150" r="136" stroke={primaryBlue} strokeWidth="1.2" strokeDasharray="3 3" fill="none" opacity="0.6" />
        <circle cx="150" cy="150" r="102" stroke={primaryBlue} strokeWidth="2.5" fill="none" />

        {/* Arc Text: NELLAI COLLEGE OF ENGINEERING (Top) */}
        <text fill={primaryBlue} fontSize="13.5" fontWeight="800" letterSpacing="2.8" fontFamily="'Cinzel', 'Times New Roman', serif" textAnchor="middle">
          <textPath href="#top-arc" startOffset="50%">
            NELLAI COLLEGE OF ENGINEERING
          </textPath>
        </text>

        {/* Arc Text: Taking you to tomorrow's technology (Bottom) */}
        <text fill={primaryBlue} fontSize="10.5" fontWeight="700" letterSpacing="1.8" fontFamily="'Cinzel', 'Times New Roman', serif" textAnchor="middle">
          <textPath href="#bottom-arc" startOffset="50%">
            Taking you to tomorrow&apos;s technology
          </textPath>
        </text>

        {/* Left Laurel Wreath Branch */}
        <g stroke={primaryBlue} fill={primaryBlue} strokeWidth="1.5">
          <path d="M 68 185 C 60 160 62 135 72 110" fill="none" strokeWidth="2.5" />
          {/* Leaves Left */}
          <path d="M 62 175 C 50 172 48 162 56 160 C 60 165 62 170 62 175 Z" />
          <path d="M 60 155 C 47 150 46 140 55 138 C 59 144 60 150 60 155 Z" />
          <path d="M 62 135 C 50 128 51 118 60 118 C 63 124 63 130 62 135 Z" />
          <path d="M 68 116 C 58 108 61 98 69 100 C 71 106 70 112 68 116 Z" />
          <path d="M 72 182 C 78 178 82 170 78 165 C 74 170 72 176 72 182 Z" />
          <path d="M 70 160 C 76 154 80 146 76 142 C 72 147 70 154 70 160 Z" />
          <path d="M 72 140 C 78 134 80 126 77 122 C 74 127 72 134 72 140 Z" />
        </g>

        {/* Right Laurel Wreath Branch */}
        <g stroke={primaryBlue} fill={primaryBlue} strokeWidth="1.5">
          <path d="M 232 185 C 240 160 238 135 228 110" fill="none" strokeWidth="2.5" />
          {/* Leaves Right */}
          <path d="M 238 175 C 250 172 252 162 244 160 C 240 165 238 170 238 175 Z" />
          <path d="M 240 155 C 253 150 254 140 245 138 C 241 144 240 150 240 155 Z" />
          <path d="M 238 135 C 250 128 249 118 240 118 C 237 124 237 130 238 135 Z" />
          <path d="M 232 116 C 242 108 239 98 231 100 C 229 106 230 112 232 116 Z" />
          <path d="M 228 182 C 222 178 218 170 222 165 C 226 170 228 176 228 182 Z" />
          <path d="M 230 160 C 224 154 220 146 224 142 C 228 147 230 154 230 160 Z" />
          <path d="M 228 140 C 222 134 220 126 223 122 C 226 127 228 134 228 140 Z" />
        </g>

        {/* Central Atomic Orbit Rings */}
        <g stroke={atomGrey} strokeWidth="1.6" fill="none" opacity="0.85">
          {/* Horizontal Ellipse */}
          <ellipse cx="150" cy="150" rx="68" ry="24" transform="rotate(-15 150 150)" />
          {/* Tilted Ellipse 1 (60 deg) */}
          <ellipse cx="150" cy="150" rx="68" ry="24" transform="rotate(45 150 150)" />
          {/* Tilted Ellipse 2 (-60 deg) */}
          <ellipse cx="150" cy="150" rx="68" ry="24" transform="rotate(105 150 150)" />
        </g>

        {/* Orbital Nodes / Electrons */}
        <circle cx="100" cy="120" r="3" fill={primaryBlue} />
        <circle cx="205" cy="175" r="3" fill={primaryBlue} />
        <circle cx="150" cy="85" r="3" fill={primaryBlue} />
        <circle cx="178" cy="208" r="3" fill={primaryBlue} />

        {/* Arched Inner Sanctuary / Mihrab Shrine */}
        <path
          d="M 125 188 L 125 142 C 125 125 175 125 175 142 L 175 188 Z"
          fill="url(#archBg)"
          stroke={gold}
          strokeWidth="2.5"
        />
        <path
          d="M 128 186 L 128 143 C 128 130 172 130 172 143 L 172 186 Z"
          stroke={gold}
          strokeWidth="1"
          strokeDasharray="2 2"
          fill="none"
        />

        {/* Radiant Diya / Knowledge Lamp */}
        {/* Sunbeam Rays above lamp */}
        <g stroke={flameYellow} strokeWidth="1.5" strokeLinecap="round">
          <line x1="150" y1="135" x2="150" y2="128" />
          <line x1="142" y1="138" x2="136" y2="133" />
          <line x1="158" y1="138" x2="164" y2="133" />
          <line x1="137" y1="146" x2="131" y2="143" />
          <line x1="163" y1="146" x2="169" y2="143" />
        </g>

        {/* Glowing Lamp Flame Circle */}
        <circle cx="150" cy="150" r="16" fill="url(#lampGlow)" />
        
        {/* Diya Base / Oil Vessel */}
        <path
          d="M 139 157 C 139 164 161 164 161 157 L 150 157 Z"
          fill={gold}
          stroke={gold}
          strokeWidth="1.2"
        />
        {/* Flame Teardrop */}
        <path
          d="M 150 142 C 146 148 146 153 150 156 C 154 153 154 148 150 142 Z"
          fill={flameOrange}
        />
        <circle cx="150" cy="152" r="2" fill="#FFFFFF" />

        {/* Arabic Inscription Plaque: Rabbi Zidni 'Ilma */}
        <rect x="130" y="168" width="40" height="15" rx="3" fill={gold} opacity="0.3" stroke={gold} strokeWidth="1" />
        <text
          x="150"
          y="179"
          fill={primaryBlue}
          fontSize="9"
          fontWeight="900"
          fontFamily="'Traditional Arabic', 'Scheherazade', 'Amiri', serif"
          textAnchor="middle"
        >
          رَّبِّ زِدْنِي عِلْمًا
        </text>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="font-extrabold text-base tracking-tight leading-tight text-gray-900 dark:text-white">
            Nellai College of Engineering
          </span>
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            Approved by AICTE • Affiliated to Anna University
          </span>
        </div>
      )}
    </div>
  );
};
