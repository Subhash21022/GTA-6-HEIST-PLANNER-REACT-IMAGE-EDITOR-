import { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore } from '../store';
import { COPY } from '../config/copy';
import { playSfx } from '../audio/soundManager';
import './TitleScreen.css';

export function TitleScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const hasSaved = useStore((s) => s.hasSavedState);
  const restoreState = useStore((s) => s.restoreState);
  const checkSavedState = useStore((s) => s.checkSavedState);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkSavedState();
  }, [checkSavedState]);

  useGSAP(() => {
    const ctx = containerRef.current;
    if (!ctx) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl.fromTo(ctx.querySelector('.title-logo-container'),
        { y: 40, opacity: 0, scale: 1.1 },
        { y: 0, opacity: 1, scale: 1, duration: 1 },
      );
      tl.fromTo(ctx.querySelector('.title-name'),
        { y: 30, opacity: 0, scale: 1.05 },
        { y: 0, opacity: 1, scale: 1, duration: 1.2 },
        '-=0.7',
      );
      tl.fromTo(ctx.querySelector('.title-tagline'),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        '-=0.5',
      );
      tl.fromTo(ctx.querySelector('.title-actions'),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        '-=0.4',
      );
      tl.fromTo(ctx.querySelectorAll('.title-step'),
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.12 },
        '-=0.3',
      );

      gsap.to(ctx.querySelector('.title-name'), {
        textShadow: '0 0 60px rgba(0, 240, 255, 0.5), 0 0 120px rgba(0, 240, 255, 0.2)',
        repeat: -1,
        yoyo: true,
        duration: 3,
        ease: 'sine.inOut',
      });
    });
  }, { scope: containerRef });

  const handleResume = async () => {
    await restoreState();
  };

  return (
    <div className="title-screen" ref={containerRef}>
      <div className="title-bg">
        <img src="/images/hero-bg.png" alt="" className="title-bg-img" />
        <div className="title-bg-overlay" />
      </div>
      <header className="title-header">
        <div className="title-logo-container">
          <img src="/images/logo.png" alt="Heist Planner Logo" className="title-logo" />
          <div className="title-logo-slant-shine" aria-hidden="true" />
        </div>
        <h1 className="title-name">{COPY.appTitle}</h1>
        <p className="title-tagline">{COPY.tagline}</p>
      </header>

      <div className="title-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={() => {
            playSfx('stinger');
            setScreen('target');
          }}
          type="button"
        >
          {COPY.planButton}
        </button>
        {hasSaved && (
          <button
            className="btn btn-secondary"
            onClick={handleResume}
            type="button"
          >
            {COPY.resumeButton}
          </button>
        )}
      </div>

      <div className="title-steps">
        {COPY.howItWorks.map((step) => (
          <div key={step.step} className="title-step glass-panel">
            <span className="title-step-num">{step.step}</span>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </div>
        ))}
      </div>

      <p className="title-desktop-note">{COPY.desktopNote}</p>

      <footer className="title-footer">
        <p className="title-author">Created by Subhash</p>
        <p className="disclaimer">{COPY.disclaimer}</p>
      </footer>
    </div>
  );
}
