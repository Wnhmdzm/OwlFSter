/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface OwlIconProps {
  className?: string;
  size?: number;
}

export default function OwlIcon({ className = "text-slate-950", size = 24 }: OwlIconProps) {
  return (
    <div 
      className={`relative select-none flex items-center justify-center font-normal leading-none ${className}`}
      style={{ width: size, height: size, fontSize: `${size}px` }}
    >
      <span>🦉</span>
      {/* Scalable absolute glowing red eye overlays */}
      <div 
        className="absolute rounded-full bg-red-500 animate-pulse"
        style={{
          width: `${size * 0.14}px`,
          height: `${size * 0.14}px`,
          top: `${size * 0.32}px`,
          left: `${size * 0.28}px`,
          boxShadow: '0 0 4px #ef4444, 0 0 2px #ef4444',
        }}
      />
      <div 
        className="absolute rounded-full bg-red-500 animate-pulse"
        style={{
          width: `${size * 0.14}px`,
          height: `${size * 0.14}px`,
          top: `${size * 0.32}px`,
          right: `${size * 0.28}px`,
          boxShadow: '0 0 4px #ef4444, 0 0 2px #ef4444',
        }}
      />
    </div>
  );
}
