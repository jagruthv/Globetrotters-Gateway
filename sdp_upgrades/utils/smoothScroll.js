/**
 * Globetrotter Gateway • Cinematic Momentum Smooth Scroll Engine
 * 
 * Powered by Lenis v1.3 + GreenSock (GSAP 3.15) Ticker Synchronization.
 * Synchronizes Lenis kinetic inertia with GSAP ScrollTrigger so animations
 * and parallax remain locked at display refresh rates (60/120Hz) with zero frame jitter.
 * 
 * Automatically disables when 'prefers-reduced-motion: reduce' is detected.
 */

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance = null;

export function initSmoothScroll() {
  if (typeof window === 'undefined') return null;

  // Reduced motion preference check
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    console.info('[Lenis] Reduced motion preferred: keeping native browser scrolling.');
    return null;
  }

  if (lenisInstance) return lenisInstance;

  lenisInstance = new Lenis({
    lerp: 0.08,             // Inertia damping (0.08 gives a luxurious, Apple-grade kinetic glide)
    duration: 1.2,          // Kinetic scroll duration
    smoothWheel: true,      // Smooth mousewheel events
    wheelMultiplier: 0.95,  // Precise wheel sensitivity
    touchMultiplier: 1.5,   // Responsive touch momentum
  });

  // Sync Lenis scroll updates with GSAP ScrollTrigger
  lenisInstance.on('scroll', ScrollTrigger.update);

  // Synchronize Lenis execution with GSAP's high-precision internal ticker loop
  const tickerHandler = (time) => {
    lenisInstance.raf(time * 1000);
  };
  gsap.ticker.add(tickerHandler);
  gsap.ticker.lagSmoothing(0);

  // Return teardown function for hot-module reloading or component unmount
  return {
    lenis: lenisInstance,
    destroy: () => {
      gsap.ticker.remove(tickerHandler);
      if (lenisInstance) {
        lenisInstance.destroy();
        lenisInstance = null;
      }
    }
  };
}

export function getLenis() {
  return lenisInstance;
}

export function scrollToTarget(target, options = {}) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, { offset: -80, duration: 1.2, ...options });
  } else if (typeof document !== 'undefined') {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: 'smooth' });
  }
}
