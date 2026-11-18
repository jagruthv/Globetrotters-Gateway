import React, { useRef, useState } from 'react';

/**
 * SpotlightCard (React Bits Primitive)
 * 
 * Interactive card with a fluid pointer-tracking radial spotlight glow.
 * Creates an ambient, tactile sense of depth on hover and mouse traversal.
 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(6, 182, 212, 0.16)', // Default cyan bioluminescence
  borderColor = 'rgba(6, 182, 212, 0.25)',
  onClick,
  ...props
}) {
  const divRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current || isFocused) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative rounded-3xl border border-white/10 bg-[#0B0F17]/80 backdrop-blur-xl overflow-hidden transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Pointer-Tracking Radial Glow */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(420px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 75%)`,
        }}
      />

      {/* Subtle Hairline Border Glow following the cursor */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl transition-opacity duration-300"
        style={{
          opacity,
          border: `1px solid ${borderColor}`,
          maskImage: `radial-gradient(240px circle at ${position.x}px ${position.y}px, black, transparent 80%)`,
          WebkitMaskImage: `radial-gradient(240px circle at ${position.x}px ${position.y}px, black, transparent 80%)`,
        }}
      />

      {/* Card Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
