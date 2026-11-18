/**
 * Globetrotter Gateway • GSAP 3.15 Micro-Interaction & Kinetic Physics Library
 * 
 * Provides production-grade GSAP hooks with automatic lifecycle cleanup (@gsap/react),
 * reduced-motion checking, and high-performance ticker alignment.
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Animate a numerical counter from 0 to target value on scroll into view.
 */
export function useGsapCountUp({
  targetNumber = 0,
  duration = 1.6,
  prefix = '',
  suffix = '',
  decimals = 0,
}) {
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      el.textContent = `${prefix}${targetNumber.toLocaleString()}${suffix}`;
      return;
    }

    const counter = { val: 0 };
    const tween = gsap.to(counter, {
      val: targetNumber,
      duration,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 92%',
        toggleActions: 'play none none none',
      },
      onUpdate: () => {
        const formatted = decimals > 0 
          ? counter.val.toFixed(decimals) 
          : Math.floor(counter.val).toLocaleString();
        el.textContent = `${prefix}${formatted}${suffix}`;
      },
      onComplete: () => {
        el.textContent = `${prefix}${targetNumber.toLocaleString()}${suffix}`;
      },
    });

    return () => {
      tween.kill();
    };
  }, [targetNumber, duration, prefix, suffix, decimals]);

  return elementRef;
}

/**
 * Cybernetic Laser Beam scanning animation for turnstile gate inspection.
 */
export function useGsapLaserScan(active = true) {
  const beamRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    if (!active || !beamRef.current) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });

    tl.fromTo(
      beamRef.current,
      { yPercent: 0, opacity: 0.3 },
      { yPercent: 450, opacity: 1, duration: 1.8, ease: 'power1.inOut' }
    );

    if (glowRef.current) {
      gsap.to(glowRef.current, {
        boxShadow: '0 0 25px rgba(0, 242, 254, 0.6), 0 0 50px rgba(0, 242, 254, 0.2)',
        duration: 0.9,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    return () => {
      tl.kill();
    };
  }, [active]);

  return { beamRef, glowRef };
}

/**
 * Magnetic button cursor attraction.
 */
export function useGsapMagnetic(strength = 0.35) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - (rect.left + rect.width / 2)) * strength;
      const y = (e.clientY - (rect.top + rect.height / 2)) * strength;

      gsap.to(el, {
        x,
        y,
        duration: 0.4,
        ease: 'power2.out',
      });
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.4)',
      });
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  return ref;
}
