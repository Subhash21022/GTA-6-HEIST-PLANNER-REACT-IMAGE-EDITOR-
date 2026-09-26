import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { type Screen } from '../store';
import { playSfx } from '../audio/soundManager';
import './NeonShutterTransition.css';

interface NeonShutterTransitionProps {
  screen: Screen;
  renderScreen: (screen: Screen) => React.ReactNode;
}

export function NeonShutterTransition({ screen, renderScreen }: NeonShutterTransitionProps) {
  // Currently displayed screen content
  const [displayedScreen, setDisplayedScreen] = useState<Screen>(screen);
  const containerRef = useRef<HTMLDivElement>(null);
  const shutterRef = useRef<HTMLDivElement>(null);
  const flareBeamRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef(false);
  const activeTimelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (screen === displayedScreen) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayedScreen(screen);
      return;
    }

    // Kill any ongoing transition timeline
    if (activeTimelineRef.current) {
      activeTimelineRef.current.kill();
    }

    const container = containerRef.current;
    const shutter = shutterRef.current;
    const beam = flareBeamRef.current;

    if (!container || !shutter || !beam) {
      setDisplayedScreen(screen);
      return;
    }

    isTransitioningRef.current = true;
    playSfx('neonShutter');

    // Make shutter visible
    gsap.set(shutter, { display: 'block', opacity: 1 });
    gsap.set(beam, { xPercent: -140 });

    const tl = gsap.timeline({
      onComplete: () => {
        isTransitioningRef.current = false;
        gsap.set(shutter, { display: 'none' });
        gsap.set(container, {
          clearProps: 'scale,filter,opacity,transform',
        });
      },
    });
    activeTimelineRef.current = tl;

    // Phase 1: Outgoing screen blurs (blur(10px)) and scales slightly down (scale(0.97))
    tl.to(container, {
      scale: 0.97,
      filter: 'blur(10px) brightness(0.85)',
      opacity: 0.65,
      duration: 0.24,
      ease: 'power2.in',
    }, 0);

    // Neon gradient lens flare sweep glides horizontally across the screen
    tl.to(beam, {
      xPercent: 140,
      duration: 0.54,
      ease: 'power2.inOut',
    }, 0);

    // Phase 2: Apex swap at the peak of the neon lens flare sweep
    tl.call(() => {
      setDisplayedScreen(screen);
    }, undefined, 0.24);

    // Set incoming screen initial high brightness & subtle scale
    tl.set(container, {
      scale: 1.03,
      filter: 'blur(8px) brightness(1.38)',
      opacity: 0.8,
    }, 0.245);

    // Phase 3: Incoming screen scales smoothly in (scale(1.03) -> scale(1.0)), fading from high brightness into crisp focus
    tl.to(container, {
      scale: 1.0,
      filter: 'blur(0px) brightness(1.0)',
      opacity: 1.0,
      duration: 0.32,
      ease: 'power3.out',
    }, 0.25);

    return () => {
      if (activeTimelineRef.current) {
        activeTimelineRef.current.kill();
      }
    };
  }, [screen]);

  return (
    <div className="neon-transition-wrapper">
      {/* Dynamic Screen Content Container */}
      <div className="neon-screen-stage" ref={containerRef}>
        {renderScreen(displayedScreen)}
      </div>

      {/* Vice City Sunset Neon Shutter & Cinematic Lens Flare Overlay */}
      <div className="neon-shutter-overlay" ref={shutterRef} aria-hidden="true">
        <div className="neon-shutter-beam" ref={flareBeamRef}>
          {/* Dual-tone gradient glow ribbon */}
          <div className="neon-glow-ribbon" />

          {/* Anamorphic horizontal lens flare streak */}
          <div className="neon-anamorphic-streak-cyan" />
          <div className="neon-anamorphic-streak-pink" />

          {/* Ultra-bright razor center slit */}
          <div className="neon-center-laser" />

          {/* Cinematic shutter HUD guides */}
          <div className="neon-shutter-hud top-hud">
            <span>[OPTIC_LEONIDA_60FPS]</span>
          </div>
          <div className="neon-shutter-hud bottom-hud">
            <span>VICE CITY // SUNSET SHUTTER</span>
          </div>
        </div>

        {/* Cinematic top & bottom widescreen letterbox accents */}
        <div className="neon-letterbox-rim top-rim" />
        <div className="neon-letterbox-rim bottom-rim" />
      </div>
    </div>
  );
}
