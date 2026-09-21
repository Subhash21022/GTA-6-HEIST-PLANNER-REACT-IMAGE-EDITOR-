import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore } from '../store';
import { COPY } from '../config/copy';
import { playSfx } from '../audio/soundManager';
import './ApproachScreen.css';

export function ApproachScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const setApproach = useStore((s) => s.setApproach);
  const goBack = useStore((s) => s.goBack);
  const target = useStore((s) => s.target);
  const addToast = useStore((s) => s.addToast);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const ctx = containerRef.current;
    if (!ctx) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        ctx.querySelector('.screen-header'),
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' },
      );

      gsap.fromTo(
        ctx.querySelector('.approach-subtitle'),
        { y: -10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, delay: 0.1, ease: 'power3.out' },
      );

      gsap.fromTo(
        ctx.querySelectorAll('.approach-card'),
        { y: 60, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          stagger: 0.15,
          ease: 'power3.out',
          delay: 0.2,
        },
      );
    });
  }, { scope: containerRef });

  const handleSelectApproach = (chosen: 'subtle' | 'loud') => {
    if (chosen === 'subtle') {
      playSfx('subtleApproach');
    } else {
      playSfx('loudApproach');
    }
    setApproach(chosen);
    const label = chosen === 'subtle' ? 'The Subtle Route' : 'The Loud Route';
    addToast(`Tactical approach locked: ${label}`);
    setScreen('crew');
  };

  return (
    <div className="approach-screen" ref={containerRef}>
      <header className="screen-header">
        <button
          className="btn btn-ghost"
          onClick={() => {
            playSfx('back');
            goBack();
          }}
          type="button"
        >
          {COPY.back}
        </button>
        <h2 className="screen-title">CHOOSE APPROACH</h2>
        <div />
      </header>

      <p className="approach-subtitle">
        SELECT HEIST TACTIC FOR {target ? target.name.toUpperCase() : 'THE OPERATION'}
      </p>

      <div className="approach-cards">
        {/* OPTION A: THE SUBTLE ROUTE */}
        <div className="approach-card subtle glass-panel hud-brackets">
          <div className="approach-badge-row">
            <span className="approach-badge subtle">SILENT & SNEAKY</span>
            <span className="approach-code">PLAN A</span>
          </div>

          <h3 className="approach-title">THE SUBTLE ROUTE</h3>
          <p className="approach-tagline">
            "Inconspicuous Entry • Zero Alarms • Maximum Stealth Payout"
          </p>

          <div className="approach-tactical-preview">
            <div className="approach-preview-graphic">
              <span className="approach-icon-large">&#9877;</span>
              <span className="approach-preview-caption">
                CCTV CONES • LASER TRIPS • VENT SHAFTS
              </span>
            </div>
          </div>

          <ul className="approach-features">
            <li className="approach-feature-item">
              <span className="approach-feature-icon">🗝️</span>
              <div className="approach-feature-text">
                <strong>Service & Air Duct Ingress</strong>
                Infiltrate through maintenance corridors and ventilation shafts without raising building alert levels.
              </div>
            </li>
            <li className="approach-feature-item">
              <span className="approach-feature-icon">📹</span>
              <div className="approach-feature-text">
                <strong>Stealth Multiplier Priority</strong>
                Alarms remain dormant. Crossing camera cones without a hacker immediately compromises the route score.
              </div>
            </li>
            <li className="approach-feature-item">
              <span className="approach-feature-icon">🎨</span>
              <div className="approach-feature-text">
                <strong>React Image Editor Kit</strong>
                Equipped with Keycard Hack, Camera Looper, Sleeping Gas, and Silenced Path drawing tools.
              </div>
            </li>
          </ul>

          <div className="approach-synergy">
            <div className="approach-synergy-title">
              <span>★</span> RECOMMENDED SPECIALISTS
            </div>
            <p className="approach-synergy-desc">
              <strong>Zara Nyx (Hacker)</strong> loops camera feeds to prevent alarm triggers; <strong>Milo Torque (Safecracker)</strong> opens biometric vaults silently.
            </p>
          </div>

          <button
            className="btn btn-primary approach-select-btn"
            onClick={() => handleSelectApproach('subtle')}
            type="button"
          >
            SELECT SUBTLE ROUTE
          </button>
        </div>

        {/* OPTION B: THE LOUD ROUTE */}
        <div className="approach-card loud glass-panel hud-brackets">
          <div className="approach-badge-row">
            <span className="approach-badge loud">AGGRESSIVE ASSAULT</span>
            <span className="approach-code">PLAN B</span>
          </div>

          <h3 className="approach-title">THE LOUD ROUTE</h3>
          <p className="approach-tagline">
            "C4 Structural Breach • Heavy Firepower • Blitz Extraction"
          </p>

          <div className="approach-tactical-preview">
            <div className="approach-preview-graphic">
              <span className="approach-icon-large">&#9889;</span>
              <span className="approach-preview-caption">
                C4 WEAK POINTS • THERMITE • SWAT INTERCEPT
              </span>
            </div>
          </div>

          <ul className="approach-features">
            <li className="approach-feature-item">
              <span className="approach-feature-icon">💣</span>
              <div className="approach-feature-text">
                <strong>Kinetic C4 Wall Detonation</strong>
                Blast directly through exterior weak points and reinforced security partitions straight to the vault.
              </div>
            </li>
            <li className="approach-feature-item">
              <span className="approach-feature-icon">🚨</span>
              <div className="approach-feature-text">
                <strong>SWAT Intercept Response</strong>
                Cameras are ignored, but police response timer starts immediately. Lingering in crossfire corridors inflicts heavy casualties.
              </div>
            </li>
            <li className="approach-feature-item">
              <span className="approach-feature-icon">🎨</span>
              <div className="approach-feature-text">
                <strong>React Image Editor Kit</strong>
                Equipped with C4 Breach Point, Thermite Drill, Heavy Cover, and Blitz Path drawing tools.
              </div>
            </li>
          </ul>

          <div className="approach-synergy">
            <div className="approach-synergy-title">
              <span>★</span> RECOMMENDED SPECIALISTS
            </div>
            <p className="approach-synergy-desc">
              <strong>Sable Cross (Muscle)</strong> suppresses SWAT choke points; <strong>Rico Valens (Driver)</strong> provides high-speed armored getaway extraction.
            </p>
          </div>

          <button
            className="btn btn-primary approach-select-btn"
            style={{ background: 'var(--color-hot-pink)', borderColor: 'var(--color-hot-pink)' }}
            onClick={() => handleSelectApproach('loud')}
            type="button"
          >
            SELECT LOUD ROUTE
          </button>
        </div>
      </div>
    </div>
  );
}
