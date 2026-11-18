import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * DecryptedText (React Bits Primitive)
 * 
 * Cyber-holographic matrix text decryption effect.
 * Scrambles through cryptographic glyphs before smoothly resolving into the target string.
 * Automatically falls back to instant plain text when reduced motion is preferred.
 */
export default function DecryptedText({
  text = '',
  speed = 45,
  maxIterations = 14,
  sequential = true,
  revealDirection = 'start',
  characters = '0123456789ABCDEF!@#$&*~§±µ¶',
  className = '',
  parentClassName = '',
  animateOn = 'mount', // 'mount' | 'hover' | 'view'
}) {
  const shouldReduceMotion = useReducedMotion();
  const [displayText, setDisplayText] = useState(() => text);
  const [isDecrypted, setIsDecrypted] = useState(() => Boolean(shouldReduceMotion));
  const containerRef = useRef(null);

  const startDecryption = useCallback(() => {
    if (shouldReduceMotion || !text) {
      setDisplayText(text);
      setIsDecrypted(true);
      return () => {};
    }

    setIsDecrypted(false);
    let iteration = 0;
    const length = text.length;

    const interval = setInterval(() => {
      setDisplayText(() => {
        return text
          .split('')
          .map((letter, index) => {
            if (letter === ' ') return ' ';

            let resolved = false;
            if (sequential) {
              if (revealDirection === 'start') {
                resolved = index < Math.floor((iteration / maxIterations) * length);
              } else if (revealDirection === 'end') {
                resolved = index >= length - Math.floor((iteration / maxIterations) * length);
              } else {
                const mid = length / 2;
                resolved = Math.abs(index - mid) < Math.floor((iteration / maxIterations) * mid);
              }
            } else {
              resolved = iteration >= maxIterations;
            }

            if (resolved) return letter;
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join('');
      });

      iteration += 1;
      if (iteration > maxIterations) {
        clearInterval(interval);
        setDisplayText(text);
        setIsDecrypted(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, maxIterations, sequential, revealDirection, characters, shouldReduceMotion]);

  useEffect(() => {
    if (shouldReduceMotion) return;

    if (animateOn === 'view') {
      let cleanupInterval = null;
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          cleanupInterval = startDecryption();
          observer.disconnect();
        }
      }, { threshold: 0.2 });

      if (containerRef.current) observer.observe(containerRef.current);
      return () => {
        observer.disconnect();
        if (cleanupInterval) cleanupInterval();
      };
    } else if (animateOn === 'mount') {
      let cleanupInterval = null;
      const timer = setTimeout(() => {
        cleanupInterval = startDecryption();
      }, 0);
      return () => {
        clearTimeout(timer);
        if (cleanupInterval) cleanupInterval();
      };
    }
  }, [animateOn, startDecryption, shouldReduceMotion]);

  const handleMouseEnter = () => {
    if (animateOn === 'hover' && isDecrypted) {
      startDecryption();
    }
  };

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      className={`inline-block font-telemetry tracking-wide ${parentClassName}`}
    >
      <span className={className}>
        {shouldReduceMotion ? text : displayText}
      </span>
    </span>
  );
}
