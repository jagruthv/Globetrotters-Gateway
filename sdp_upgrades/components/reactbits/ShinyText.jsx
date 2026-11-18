import React from 'react';

/**
 * ShinyText (React Bits Primitive)
 * 
 * Elegant metallic and holographic light sheen moving continuously across text.
 * Uses high-performance background-clip with linear-gradient sweep.
 */
export default function ShinyText({
  text = '',
  disabled = false,
  speed = 4, // Seconds per sweep
  className = '',
}) {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`inline-block bg-clip-text text-transparent bg-gradient-to-r from-slate-400 via-white to-slate-400 bg-[length:250%_100%] ${
        disabled ? '' : 'animate-shimmer'
      } ${className}`}
      style={{
        animationDuration,
        backgroundImage: 'linear-gradient(120deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.95) 45%, rgba(0, 242, 254, 0.8) 55%, rgba(255, 255, 255, 0.4) 100%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
      }}
    >
      {text}
    </span>
  );
}
