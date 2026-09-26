import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { playSfx } from '../audio/soundManager';
import './SafeCrackerModal.css';

interface SafeCrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SafeCrackerModal({ isOpen, onClose, onSuccess }: SafeCrackerModalProps) {
  const target = useStore((s) => s.target);
  const crew = useStore((s) => s.crew);
  const codename = useStore((s) => s.codename);
  const setSafeCracked = useStore((s) => s.setSafeCracked);
  const addToast = useStore((s) => s.addToast);

  // Check if Nora (Safecracker) is in the crew for specialist acoustic perk
  const hasSafecracker = crew.some(
    (c) => c.modifierId === 'safecracker' || c.id === 'nora' || c.role.toLowerCase().includes('safe'),
  );

  // 3-Number Combination Sequence (0 to 99)
  const [combo, setCombo] = useState<[number, number, number]>([35, 72, 18]);
  const [currentStage, setCurrentStage] = useState<0 | 1 | 2 | 3>(0); // 0, 1, 2 = tumblers, 3 = all unlocked!
  const [rotation, setRotation] = useState<number>(0); // degrees
  const [timeLeft, setTimeLeft] = useState<number>(30); // 30s countdown
  const [isAlarmTripped, setIsAlarmTripped] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [tension, setTension] = useState<number>(0); // 0 to 1

  const dialRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastAngleRef = useRef<number>(0);
  const lastNumberRef = useRef<number>(0);
  const sweetSpotHoldTimeRef = useRef<number>(0);
  const timerIdRef = useRef<any>(null);

  // Initialize procedural combination based on target and codename
  useEffect(() => {
    if (!isOpen) return;
    const seed = codename.split('').reduce((acc, c) => acc + c.charCodeAt(0), target?.baseTake ?? 1986);
    const n1 = (seed * 13) % 90 + 5;
    const n2 = (seed * 37 + 25) % 90 + 5;
    const n3 = (seed * 59 + 50) % 90 + 5;
    setCombo([n1, n2 === n1 ? (n2 + 15) % 100 : n2, n3 === n2 ? (n3 + 20) % 100 : n3]);
    setCurrentStage(0);
    setRotation(0);
    setTimeLeft(30);
    setIsAlarmTripped(false);
    setIsUnlocked(false);
    setTension(0);
    sweetSpotHoldTimeRef.current = 0;
  }, [isOpen, codename, target]);

  // 30-second silent alarm timer countdown
  useEffect(() => {
    if (!isOpen || isUnlocked || isAlarmTripped) {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      return;
    }

    timerIdRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIdRef.current);
          setIsAlarmTripped(true);
          playSfx('safeAlarmKlaxon');
          return 0;
        }
        if (prev === 11 || prev === 6) {
          playSfx('wantedStar', 0.6);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    };
  }, [isOpen, isUnlocked, isAlarmTripped]);

  // Calculate current dial number from rotation angle (0 to 99)
  const getDialNumber = useCallback((deg: number): number => {
    const normalizedDeg = ((deg % 360) + 360) % 360;
    // Top index is 0, turning clockwise increases number or moves dial left
    const num = Math.round(((360 - normalizedDeg) % 360) / 3.6) % 100;
    return num;
  }, []);

  // Update tension meter and check for tumbler gate alignment
  const checkTumblerAlignment = useCallback(
    (currentDeg: number) => {
      if (currentStage >= 3 || isAlarmTripped) return;

      const currNum = getDialNumber(currentDeg);
      const targetNum = combo[currentStage as 0 | 1 | 2];
      if (targetNum === undefined) return;

      // Play ratchet sound when dial steps to a new number
      if (currNum !== lastNumberRef.current) {
        playSfx('safeDialTick', 0.85);
        lastNumberRef.current = currNum;
      }

      // Shortest circular distance between numbers on 100-step dial
      const diff = Math.min(Math.abs(currNum - targetNum), 100 - Math.abs(currNum - targetNum));

      // Nora's safecracker acoustic stethoscope widens the detection range
      const detectionRadius = hasSafecracker ? 18 : 12;
      const tolerance = hasSafecracker ? 2.5 : 1.2;

      const newTension = Math.max(0, 1 - diff / detectionRadius);
      setTension(newTension);

      // Check if player stopped within sweet spot tolerance
      if (diff <= tolerance) {
        sweetSpotHoldTimeRef.current += 1;
        // Lock pin drops into tumbler gate
        playSfx('tumblerLockClank', 1.0);
        const nextStage = (currentStage + 1) as 0 | 1 | 2 | 3;
        setCurrentStage(nextStage);
        setTension(1);
        sweetSpotHoldTimeRef.current = 0;

        if (nextStage === 3) {
          // All 3 tumblers unlocked!
          setIsUnlocked(true);
          setSafeCracked(true);
          playSfx('vaultSteamHiss', 1.0);
          addToast('VAULT TUMBLERS UNLOCKED! S-RANK GUARANTEED (+$450,000 LOOT)');
          setTimeout(() => {
            onSuccess();
          }, 2400);
        }
      }
    },
    [currentStage, combo, isAlarmTripped, hasSafecracker, getDialNumber, setSafeCracked, addToast, onSuccess],
  );

  // Manual rotation step (buttons / arrow keys)
  const rotateBy = useCallback(
    (deltaDeg: number) => {
      if (isUnlocked || isAlarmTripped) return;
      setRotation((prev) => {
        const next = prev + deltaDeg;
        checkTumblerAlignment(next);
        return next;
      });
    },
    [isUnlocked, isAlarmTripped, checkTumblerAlignment],
  );

  // Mouse / Touch Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isUnlocked || isAlarmTripped) return;
    const dial = dialRef.current;
    if (!dial) return;

    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    lastAngleRef.current = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || isUnlocked || isAlarmTripped) return;
    const dial = dialRef.current;
    if (!dial) return;

    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const newAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);

    let delta = newAngle - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    lastAngleRef.current = newAngle;
    setRotation((prev) => {
      const next = prev + delta;
      checkTumblerAlignment(next);
      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  // Keyboard navigation [←] [→]
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        rotateBy(3.6);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        rotateBy(-3.6);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, rotateBy, onClose]);

  // Wheel scroll rotation
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.deltaY > 0 ? 3.6 : -3.6;
    rotateBy(step);
  };

  if (!isOpen) return null;

  const currentNumber = getDialNumber(rotation);
  const targetDirection = currentStage === 0 ? 'CLOCKWISE ↻' : currentStage === 1 ? 'COUNTER-CLOCKWISE ↺' : 'CLOCKWISE ↻';

  return (
    <div className="safe-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="safe-modal-container hud-brackets" onClick={(e) => e.stopPropagation()}>
        {/* Vault Door Top Header */}
        <header className="safe-header">
          <div className="safe-header-meta">
            <span className="safe-tag">[SECURITY CLEARANCE: SUB-LEVEL 3]</span>
            <h2 className="safe-vault-title">
              {target?.name || 'SABLE TRUST BANK'} • HEAVY STEEL VAULT
            </h2>
            <p className="safe-vault-subtitle">
              SARGENT & GREENLEAF 3-TUMBLER TIME-LOCK CHASSIS
            </p>
          </div>

          <div className="safe-timer-hud">
            <span className="safe-timer-label">SILENT ALARM TRIPWIRE:</span>
            <div className={`safe-timer-display ${timeLeft <= 8 ? 'critical blinking' : ''}`}>
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </div>
          </div>

          <button className="safe-close-btn" onClick={onClose} type="button" title="Close safe cracking interface">
            ✕
          </button>
        </header>

        {/* Safecracker Specialist Perk Banner */}
        {hasSafecracker && (
          <div className="safecracker-perk-banner">
            <span className="perk-icon">🎧</span>
            <span>
              <strong>NORA'S STETHOSCOPE ACTIVE:</strong> Enhanced acoustic resonance & widened tumbler gate sweet-spot!
            </span>
          </div>
        )}

        <div className="safe-stage-layout">
          {/* Left Column: Analog Tension Needle & Acoustic Stethoscope VU Meter */}
          <div className="safe-meter-column glass-panel">
            <h4 className="meter-title">TENSION NEEDLE</h4>
            <div className="analog-meter-dial">
              <svg className="meter-svg" viewBox="0 0 160 90">
                <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#22304d" strokeWidth="10" />
                <path d="M 100 80 A 60 60 0 0 1 140 80" fill="none" stroke="#ff2255" strokeWidth="10" />
                <path d="M 125 80 A 60 60 0 0 1 140 80" fill="none" stroke="#00ffaa" strokeWidth="10" />
                {/* Needle */}
                <line
                  x1="80"
                  y1="80"
                  x2={80 + 55 * Math.cos(Math.PI * (1 - tension * 0.95))}
                  y2={80 - 55 * Math.sin(Math.PI * (1 - tension * 0.95))}
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="80" cy="80" r="7" fill="#ff2255" />
              </svg>
              <div className="meter-labels">
                <span>SLACK</span>
                <span>SWEET SPOT</span>
              </div>
            </div>

            <div className="contact-vibe-bar">
              <span className="vibe-label">GATE VIBRATION:</span>
              <div className="vibe-meter-track">
                <div
                  className="vibe-meter-fill"
                  style={{
                    width: `${Math.round(tension * 100)}%`,
                    backgroundColor: tension > 0.85 ? '#00ffaa' : tension > 0.5 ? '#f5c518' : '#00f0ff',
                  }}
                />
              </div>
            </div>

            {/* Tumbler Gates Status Box */}
            <div className="tumblers-status-box">
              <div className={`tumbler-gate ${currentStage > 0 ? 'unlocked' : 'active'}`}>
                <span className="gate-icon">{currentStage > 0 ? '🔓' : '🔒'}</span>
                <span className="gate-text">TUMBLER #1</span>
                <span className="gate-state">{currentStage > 0 ? 'ALIGNED' : 'LOCKED'}</span>
              </div>
              <div className={`tumbler-gate ${currentStage > 1 ? 'unlocked' : currentStage === 1 ? 'active' : ''}`}>
                <span className="gate-icon">{currentStage > 1 ? '🔓' : '🔒'}</span>
                <span className="gate-text">TUMBLER #2</span>
                <span className="gate-state">{currentStage > 1 ? 'ALIGNED' : 'LOCKED'}</span>
              </div>
              <div className={`tumbler-gate ${currentStage > 2 ? 'unlocked' : currentStage === 2 ? 'active' : ''}`}>
                <span className="gate-icon">{currentStage > 2 ? '🔓' : '🔒'}</span>
                <span className="gate-text">TUMBLER #3</span>
                <span className="gate-state">{currentStage > 2 ? 'ALIGNED' : 'LOCKED'}</span>
              </div>
            </div>
          </div>

          {/* Center: Massive Rotary Combination Dial */}
          <div className="safe-dial-center">
            {/* Red 12 O'Clock Top Index Needle */}
            <div className="dial-index-needle" aria-hidden="true">
              ▼
            </div>

            <div
              className={`safe-rotary-dial ${tension > 0.8 ? 'vibrating' : ''}`}
              ref={dialRef}
              style={{ transform: `rotate(${rotation}deg)` }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
            >
              {/* Dial Knurled Brass Rim */}
              <div className="dial-brass-rim" />

              {/* Numbers Ring (0 to 99, 10-step numbers) */}
              <div className="dial-face">
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((num) => {
                  const deg = num * 3.6;
                  return (
                    <div
                      key={num}
                      className="dial-number-mark"
                      style={{
                        transform: `rotate(${deg}deg) translate(0, -118px)`,
                      }}
                    >
                      <span style={{ transform: `rotate(-${deg}deg)` }}>{num}</span>
                    </div>
                  );
                })}

                {/* Micro Tick Marks */}
                {Array.from({ length: 50 }, (_, i) => (
                  <div
                    key={i}
                    className="dial-tick-mark"
                    style={{ transform: `rotate(${i * 7.2}deg)` }}
                  />
                ))}

                {/* Dial Center Boss Knob */}
                <div className="dial-center-knob">
                  <div className="dial-readout-digital">{currentNumber}</div>
                </div>
              </div>
            </div>

            {/* Instruction Banner */}
            <div className="dial-instruction-banner">
              {currentStage < 3 && !isAlarmTripped ? (
                <span>
                  GATE #{currentStage + 1}: ROTATE <strong>{targetDirection}</strong> UNTIL BOLT CLANKS
                </span>
              ) : isUnlocked ? (
                <span className="success-text">★ VAULT DOOR BREACHED • EXTRACTION READY ★</span>
              ) : (
                <span className="alarm-text">⚠️ SILENT ALARM TRIPPED • LOCKDOWN ACTIVE</span>
              )}
            </div>

            {/* Manual Step Rotate Buttons (Accessibility & Precision) */}
            <div className="dial-step-controls">
              <button
                className="btn btn-secondary dial-step-btn"
                onClick={() => rotateBy(-3.6)}
                disabled={isUnlocked || isAlarmTripped}
                type="button"
                title="Rotate counter-clockwise 1 tick [←]"
              >
                ↺ STEP LEFT (←)
              </button>
              <button
                className="btn btn-secondary dial-step-btn"
                onClick={() => rotateBy(3.6)}
                disabled={isUnlocked || isAlarmTripped}
                type="button"
                title="Rotate clockwise 1 tick [→]"
              >
                ↻ STEP RIGHT (→)
              </button>
            </div>
          </div>

          {/* Right Column: Vault Loot & Bonus Intel */}
          <div className="safe-loot-column glass-panel">
            <h4 className="loot-header">VAULT INTERIOR INTEL</h4>
            <div className="loot-target-card">
              <span className="loot-badge">GUARANTEED LOOT</span>
              <div className="loot-value">+$450,000</div>
              <p className="loot-desc">BEARER BONDS & RAW DIAMONDS</p>
            </div>

            <div className="perk-breakdown">
              <div className="perk-row">
                <span>MISSION GRADE:</span>
                <strong className="text-gold">GUARANTEED S-RANK</strong>
              </div>
              <div className="perk-row">
                <span>ALARM OVERRIDE:</span>
                <strong className="text-cyan">ZERO DETECTION TRIP</strong>
              </div>
              <div className="perk-row">
                <span>SYNDICATE CUT:</span>
                <strong className="text-green">+100% CLEAN EXTRACTION</strong>
              </div>
            </div>

            {isUnlocked && (
              <div className="safe-success-banner">
                <span className="success-icon">🏆</span>
                <h4>CRACKED SUCCESSFULLY</h4>
                <p>The vault bolts retracted smoothly. $450,000 has been credited to your final heist take.</p>
              </div>
            )}

            {isAlarmTripped && (
              <div className="safe-failed-banner">
                <span className="failed-icon">🚨</span>
                <h4>LOCKOUT TRIGGERED</h4>
                <p>The time expired before the tumblers were cleared.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setTimeLeft(30);
                    setIsAlarmTripped(false);
                    setCurrentStage(0);
                    setRotation(0);
                  }}
                  type="button"
                >
                  🔄 RETRY SAFE BREACH
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
