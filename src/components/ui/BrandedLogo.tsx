'use client';

import React from 'react';
import Image from 'next/image';
import { BRAND_CONFIG } from '../../config/branding';

interface BrandedLogoProps {
  className?: string;
  width?: number;
  height?: number;
  iconOnly?: boolean;
  animated?: boolean;
}

export const BrandedLogo: React.FC<BrandedLogoProps> = ({
  className = '',
  width = 32,
  height = 32,
  iconOnly = false,
  animated = false,
}) => {
  const logoSrc = iconOnly ? BRAND_CONFIG.logo.iconSrc : BRAND_CONFIG.logo.src;
  
  return (
    <div 
      className={`inline-flex items-center justify-center select-none ${className} ${
        animated ? 'animate-pulse' : ''
      }`}
    >
      <img
        src={logoSrc}
        alt={BRAND_CONFIG.logo.alt}
        width={width}
        height={height}
        style={{
          objectFit: 'contain',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
        className="block"
      />
    </div>
  );
};
