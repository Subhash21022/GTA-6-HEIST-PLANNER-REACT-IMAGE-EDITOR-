import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import {
  playSfx,
  startDrillHum,
  updateDrillHeat,
  stopDrillHum,
} from '../audio/soundManager';
import './ThermalDrillModal.css';

interface ThermalDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  opacity: number;
}

export function ThermalDrillModal({ isOpen, onClose, onSuccess }: ThermalDrillModalProps) {
  const target = useStore((s) => s.target);
  const crew = useStore((s) => s.crew);
  const setThermalDrilled = useStore((s) => s.setThermalDrilled);
  const addToast = useStore((s) => s.addToast);

  // Specialist Synergy: Milo Torque (Safecracker/Driller) or Sable Cross (Muscle)
  const hasDrillSpecialist = crew.some(
    (c) =>
      c.modifierId === 'safecracker' ||
      c.id === 'milo' ||
      c.modifierId === 'muscle' ||
      c.id === 'sable',
  );
  const specialistMember = crew.find(
    (c) => c.id === 'milo' || c.modifierId === 'safecracker' || c.id === 'sable',
  );

  // Heat thresholds (Specialist widens the sweet spot)
  const SWEET_MIN = hasDrillSpecialist ? 0.65 : 0.70;
  const SWEET_MAX = hasDrillSpecialist ? 0.90 : 0.85;
  const COOLDOWN_DURATION = hasDrillSpecialist ? 2.8 : 4.0; // seconds

  // Game state
  const [activePin, setActivePin] = useState<0 | 1 | 2 | 3 | 4>(0); // 0..3 pins, 4 = all complete
  const [pinProgress, setPinProgress] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [heat, setHeat] = useState<number>(0); // 0 to 1
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [isOverheated, setIsOverheated] = useState<boolean>(false);
  const [overheatCooldown, setOverheatCooldown] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(45); // 45s silent alarm
  const [isAlarmTripped, setIsAlarmTripped] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isPressingRef = useRef<boolean>(false);
  const heatRef = useRef<number>(0);
  const isOverheatedRef = useRef<boolean>(false);
  const activePinRef = useRef<number>(0);
  const pinProgressRef = useRef<[number, number, number, number]>([0, 0, 0, 0]);
  const isVictoryRef = useRef<boolean>(false);
  const isAlarmTrippedRef = useRef<boolean>(false);
  const lastTimeRef = useRef<number>(performance.now());
  const crackleTimerRef = useRef<number>(0);

  // Particles
  const sparksRef = useRef<SparkParticle[]>([]);
  const smokeRef = useRef<SmokeParticle[]>([]);

  // Keep refs in sync with state for animation loop
  useEffect(() => {
    isPressingRef.current = isPressing;
  }, [isPressing]);

  useEffect(() => {
    heatRef.current = heat;
  }, [heat]);

  useEffect(() => {
    isOverheatedRef.current = isOverheated;
  }, [isOverheated]);

  useEffect(() => {
    activePinRef.current = activePin;
  }, [activePin]);

  useEffect(() => {
    pinProgressRef.current = pinProgress;
  }, [pinProgress]);

  useEffect(() => {
    isVictoryRef.current = isVictory;
  }, [isVictory]);

  useEffect(() => {
    isAlarmTrippedRef.current = isAlarmTripped;
  }, [isAlarmTripped]);

  // Reset state when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopDrillHum();
      return;
    }

    setActivePin(0);
    setPinProgress([0, 0, 0, 0]);
    setHeat(0);
    setIsPressing(false);
    setIsOverheated(false);
    setOverheatCooldown(0);
    setTimeLeft(45);
    setIsAlarmTripped(false);
    setIsVictory(false);
    sparksRef.current = [];
    smokeRef.current = [];
    heatRef.current = 0;
    isPressingRef.current = false;
    isOverheatedRef.current = false;
    activePinRef.current = 0;
    pinProgressRef.current = [0, 0, 0, 0];
    isVictoryRef.current = false;
    isAlarmTrippedRef.current = false;
    lastTimeRef.current = performance.now();
  }, [isOpen]);

  // 45-second silent alarm countdown
  useEffect(() => {
    if (!isOpen || isVictory || isAlarmTripped) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsAlarmTripped(true);
          stopDrillHum();
          playSfx('safeAlarmKlaxon');
          return 0;
        }
        if (prev === 11 || prev === 6) {
          playSfx('wantedStar', 0.65);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isVictory, isAlarmTripped]);

  // Key listeners for [SPACE] trigger
  useEffect(() => {
    if (!isOpen || isVictory || isAlarmTripped) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handleTriggerStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTriggerRelease();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      stopDrillHum();
    };
  }, [isOpen, isVictory, isAlarmTripped, isOverheated]);

  // Engage trigger
  const handleTriggerStart = useCallback(() => {
    if (isVictoryRef.current || isAlarmTrippedRef.current) return;

    if (isOverheatedRef.current) {
      playSfx('drillJamBuzz', 0.8);
      return;
    }

    setIsPressing(true);
    startDrillHum(heatRef.current);
  }, []);

  // Release trigger
  const handleTriggerRelease = useCallback(() => {
    setIsPressing(false);
    stopDrillHum();
  }, []);

  // Overheat trigger lockout handler
  const triggerOverheat = useCallback(() => {
    setIsOverheated(true);
    setIsPressing(false);
    stopDrillHum();
    playSfx('drillOverheatHiss', 1.0);
    setOverheatCooldown(COOLDOWN_DURATION);

    // Spawn massive steam burst
    for (let i = 0; i < 28; i++) {
      smokeRef.current.push({
        x: 480 + (Math.random() - 0.5) * 60,
        y: 280 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 90,
        vy: -40 - Math.random() * 80,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8,
        radius: 12 + Math.random() * 20,
        opacity: 0.85,
      });
    }
  }, [COOLDOWN_DURATION]);

  // Main 60fps Game Loop & Canvas Renderer
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      if (!running) return;

      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      const currentPin = activePinRef.current;
      const pressing = isPressingRef.current;
      const overheated = isOverheatedRef.current;
      const victory = isVictoryRef.current;
      const alarmTripped = isAlarmTrippedRef.current;

      // 1. UPDATE HEAT PHYSICS
      let currentHeat = heatRef.current;

      if (overheated) {
        // Dissipating heat during cooldown
        currentHeat = Math.max(0, currentHeat - dt * (1.0 / COOLDOWN_DURATION));
        setOverheatCooldown((prev) => {
          const next = Math.max(0, prev - dt);
          if (next === 0 && overheated) {
            setIsOverheated(false);
            playSfx('select', 0.9);
          }
          return next;
        });
      } else if (pressing && !victory && !alarmTripped) {
        // Heating up: rate accelerates near top
        const heatRate = hasDrillSpecialist ? 0.32 : 0.38;
        const accel = currentHeat > 0.8 ? 1.4 : 1.0;
        currentHeat = Math.min(1.0, currentHeat + dt * heatRate * accel);

        // Check for 100% overheat
        if (currentHeat >= 1.0) {
          currentHeat = 1.0;
          triggerOverheat();
        }
      } else {
        // Cooling down convective rate
        const coolRate = 0.45;
        currentHeat = Math.max(0, currentHeat - dt * coolRate);
      }

      heatRef.current = currentHeat;
      setHeat(currentHeat);
      updateDrillHeat(currentHeat);

      // 2. UPDATE DRILLING PROGRESS & PINS
      if (pressing && !overheated && !victory && !alarmTripped && currentPin < 4) {
        const inSweet = currentHeat >= SWEET_MIN && currentHeat <= SWEET_MAX;
        const isWarm = currentHeat >= 0.45 && currentHeat < SWEET_MIN;

        // Progress speed: 100% in sweet spot (~3.2s per pin), 18% in warm, 0% in cold
        let meltSpeed = 0;
        if (inSweet) {
          meltSpeed = 0.31; // ~3.2 seconds to melt one pin
        } else if (isWarm) {
          meltSpeed = 0.06;
        }

        if (meltSpeed > 0) {
          const updated = [...pinProgressRef.current] as [number, number, number, number];
          const newProg = Math.min(1.0, updated[currentPin] + dt * meltSpeed);
          updated[currentPin] = newProg;
          pinProgressRef.current = updated;
          setPinProgress(updated);

          // Audio: periodic spark crackles
          crackleTimerRef.current += dt;
          if (inSweet && crackleTimerRef.current > 0.08) {
            crackleTimerRef.current = 0;
            playSfx('thermalCrackle', 0.85);
          }

          // Check if current pin melted completely!
          if (newProg >= 1.0) {
            playSfx('pinBreakthrough', 1.0);

            // Explosive spark burst on breakthrough
            for (let i = 0; i < 40; i++) {
              const ang = (Math.random() - 0.5) * Math.PI * 1.6;
              const spd = 120 + Math.random() * 260;
              sparksRef.current.push({
                x: 480,
                y: 190 + currentPin * 75,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: 0,
                maxLife: 0.6 + Math.random() * 0.4,
                color: Math.random() > 0.3 ? '#ffffff' : '#ff9900',
                size: 2 + Math.random() * 3,
              });
            }

            const nextPin = currentPin + 1;
            activePinRef.current = nextPin;
            setActivePin(nextPin as 0 | 1 | 2 | 3 | 4);

            if (nextPin >= 4) {
              // ALL 4 PINS MELTED! VICTORY!
              setIsVictory(true);
              setIsPressing(false);
              stopDrillHum();
              playSfx('depositBoxUnlock', 1.0);
              setThermalDrilled(true);
              addToast('🔥 DEPOSIT BOXES MELTED: +$350,000 & +15% MISSION SCORE!');
            }
          }
        }
      }

      // 3. EMIT SPARK PARTICLES
      const contactY = 190 + Math.min(currentPin, 3) * 75;
      if (pressing && !overheated && !victory && currentHeat > 0.3) {
        const inSweet = currentHeat >= SWEET_MIN && currentHeat <= SWEET_MAX;
        const sparkRate = inSweet ? 6 : 2;
        for (let i = 0; i < sparkRate; i++) {
          const ang = Math.PI + (Math.random() - 0.5) * 1.3;
          const spd = 60 + Math.random() * (inSweet ? 320 : 140);
          sparksRef.current.push({
            x: 480 + (Math.random() - 0.5) * 8,
            y: contactY + (Math.random() - 0.5) * 8,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 0,
            maxLife: 0.3 + Math.random() * 0.45,
            color:
              inSweet
                ? Math.random() > 0.5
                  ? '#ffffff'
                  : '#00f0ff'
                : Math.random() > 0.5
                ? '#ffaa00'
                : '#ff3300',
            size: 1.5 + Math.random() * 2.5,
          });
        }
      }

      // 4. EMIT SMOKE PARTICLES
      if ((overheated || (!pressing && currentHeat > 0.6)) && Math.random() < 0.35) {
        smokeRef.current.push({
          x: 480 + (Math.random() - 0.5) * 20,
          y: contactY,
          vx: (Math.random() - 0.5) * 35,
          vy: -30 - Math.random() * 40,
          life: 0,
          maxLife: 0.9 + Math.random() * 0.5,
          radius: 8 + Math.random() * 12,
          opacity: 0.6,
        });
      }

      // 5. UPDATE PARTICLES
      // Sparks
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const p = sparksRef.current[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 480 * dt; // Gravity
        if (p.life >= p.maxLife) {
          sparksRef.current.splice(i, 1);
        }
      }

      // Smoke
      for (let i = smokeRef.current.length - 1; i >= 0; i--) {
        const s = smokeRef.current[i];
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.radius += dt * 14;
        s.opacity = Math.max(0, 0.6 * (1 - s.life / s.maxLife));
        if (s.life >= s.maxLife) {
          smokeRef.current.splice(i, 1);
        }
      }

      // 6. RENDER FRAME
      renderCanvasFrame(ctx, canvas.width, canvas.height, {
        currentHeat,
        activePin: currentPin,
        pinProgress: pinProgressRef.current,
        pressing,
        overheated,
        victory,
        sweetMin: SWEET_MIN,
        sweetMax: SWEET_MAX,
        sparks: sparksRef.current,
        smoke: smokeRef.current,
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      stopDrillHum();
    };
  }, [isOpen, hasDrillSpecialist, SWEET_MIN, SWEET_MAX, triggerOverheat, setThermalDrilled, addToast]);

  // Canvas Drawing Routine
  const renderCanvasFrame = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: {
      currentHeat: number;
      activePin: number;
      pinProgress: [number, number, number, number];
      pressing: boolean;
      overheated: boolean;
      victory: boolean;
      sweetMin: number;
      sweetMax: number;
      sparks: SparkParticle[];
      smoke: SmokeParticle[];
    },
  ) => {
    ctx.clearRect(0, 0, w, h);

    // Background: Heavy Vault Steel Wall
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0c1017');
    bgGrad.addColorStop(0.5, '#131924');
    bgGrad.addColorStop(1, '#0a0d12');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle Industrial Grid / Hex Pattern
    ctx.strokeStyle = 'rgba(0, 229, 199, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Vault Door Deposit Gate Housing Plate
    ctx.save();
    const gateX = 420;
    const gateY = 120;
    const gateW = 340;
    const gateH = 340;

    // Outer Beveled Steel Plate
    ctx.fillStyle = '#1c2433';
    ctx.strokeStyle = '#2f3b52';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(gateX, gateY, gateW, gateH, 12);
    ctx.fill();
    ctx.stroke();

    // Rivets & Screws on plate corners
    const rivets = [
      [gateX + 20, gateY + 20],
      [gateX + gateW - 20, gateY + 20],
      [gateX + 20, gateY + gateH - 20],
      [gateX + gateW - 20, gateY + gateH - 20],
      [gateX + gateW / 2, gateY + 16],
      [gateX + gateW / 2, gateY + gateH - 16],
    ];
    rivets.forEach(([rx, ry]) => {
      ctx.fillStyle = '#0f141c';
      ctx.beginPath();
      ctx.arc(rx, ry, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3b4a66';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Vault Stencil Header
    ctx.font = '700 13px "Space Mono", monospace';
    ctx.fillStyle = '#5c6f8f';
    ctx.letterSpacing = '2px';
    ctx.fillText('LEONIDA SECURE • INNER DEPOSIT GATE', gateX + 32, gateY + 38);

    // ── DRAW 4 LOCK PINS ──
    for (let i = 0; i < 4; i++) {
      const pinY = 190 + i * 75;
      const isCurrent = state.activePin === i;
      const isMelted = state.pinProgress[i] >= 1.0;
      const prog = state.pinProgress[i];

      // Pin housing slot
      ctx.fillStyle = '#0e121a';
      ctx.strokeStyle = isCurrent ? '#00e5c7' : '#232c3d';
      ctx.lineWidth = isCurrent ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(gateX + 40, pinY - 24, 250, 48, 6);
      ctx.fill();
      ctx.stroke();

      // Pin Label & Status
      ctx.font = '700 11px "Space Mono", monospace';
      ctx.fillStyle = isMelted ? '#00e5c7' : isCurrent ? '#ffaa00' : '#4b5563';
      ctx.fillText(
        `PIN 0${i + 1}: ${isMelted ? 'MELTED [100%]' : isCurrent ? `BORING [${Math.round(prog * 100)}%]` : 'LOCKED'}`,
        gateX + 50,
        pinY - 6,
      );

      // Pin Heavy Steel Core Cylinder (sliding bar)
      const coreX = gateX + 50;
      const coreW = 230;
      const coreH = 14;

      // Base bar background
      ctx.fillStyle = '#1e2638';
      ctx.fillRect(coreX, pinY + 4, coreW, coreH);

      // Steel Pin Cylinder (intact part)
      const intactRatio = 1.0 - prog;
      if (intactRatio > 0) {
        const pinGrad = ctx.createLinearGradient(coreX, pinY + 4, coreX, pinY + 4 + coreH);
        pinGrad.addColorStop(0, '#94a3b8');
        pinGrad.addColorStop(0.5, '#e2e8f0');
        pinGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = pinGrad;
        ctx.fillRect(coreX, pinY + 4, coreW * intactRatio, coreH);
      }

      // Molten Glowing Bore Hole on the active pin
      if (isCurrent && prog > 0 && !isMelted) {
        const boreX = coreX + coreW * intactRatio;
        const glowRad = 10 + state.currentHeat * 16;
        const heatGrad = ctx.createRadialGradient(boreX, pinY + 11, 2, boreX, pinY + 11, glowRad);

        if (state.currentHeat >= state.sweetMin && state.currentHeat <= state.sweetMax) {
          // Sweet spot blinding heat
          heatGrad.addColorStop(0, '#ffffff');
          heatGrad.addColorStop(0.25, '#00f0ff');
          heatGrad.addColorStop(0.6, '#ffaa00');
          heatGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
        } else {
          heatGrad.addColorStop(0, '#ffcc00');
          heatGrad.addColorStop(0.4, '#ff4400');
          heatGrad.addColorStop(1, 'rgba(200, 20, 0, 0)');
        }

        ctx.fillStyle = heatGrad;
        ctx.beginPath();
        ctx.arc(boreX, pinY + 11, glowRad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Severed molten edge if already melted
      if (isMelted) {
        ctx.fillStyle = '#22c55e';
        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillText('✓ SEVERED', gateX + 215, pinY - 6);
      }
    }

    ctx.restore();

    // ── DRAW THERMAL LANCE / PLASMA DRILL (First-Person View) ──
    const targetY = 190 + Math.min(state.activePin, 3) * 75;
    const drillTipX = 470;
    const drillTipY = targetY + 11;

    // Drill Body & Hydraulic Lance Barrel
    ctx.save();
    // Lance shaft
    const shaftGrad = ctx.createLinearGradient(0, drillTipY - 24, drillTipX, drillTipY + 24);
    shaftGrad.addColorStop(0, '#111827');
    shaftGrad.addColorStop(0.4, '#374151');
    shaftGrad.addColorStop(0.7, '#4b5563');
    shaftGrad.addColorStop(1, '#1f2937');
    ctx.fillStyle = shaftGrad;
    ctx.beginPath();
    ctx.moveTo(0, drillTipY - 60);
    ctx.lineTo(drillTipX - 80, drillTipY - 26);
    ctx.lineTo(drillTipX - 25, drillTipY - 14);
    ctx.lineTo(drillTipX - 4, drillTipY - 5);
    ctx.lineTo(drillTipX - 4, drillTipY + 5);
    ctx.lineTo(drillTipX - 25, drillTipY + 14);
    ctx.lineTo(drillTipX - 80, drillTipY + 26);
    ctx.lineTo(0, drillTipY + 60);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Ceramic Heat Dissipator Rings (Glowing with heat)
    for (let r = 0; r < 4; r++) {
      const rx = drillTipX - 75 + r * 15;
      const rHeat = Math.max(0, state.currentHeat - 0.2);
      ctx.fillStyle = `rgba(${Math.round(255 * rHeat)}, ${Math.round(140 * rHeat)}, 0, 0.85)`;
      ctx.fillRect(rx, drillTipY - 20 + r * 2, 7, 40 - r * 4);
    }

    // Plasma Torch Jet / Laser Flame
    if (state.pressing && !state.overheated && !state.victory && state.currentHeat > 0.1) {
      const flameLen = 25 + state.currentHeat * 35;
      const inSweet = state.currentHeat >= state.sweetMin && state.currentHeat <= state.sweetMax;

      const flameGrad = ctx.createRadialGradient(
        drillTipX,
        drillTipY,
        2,
        drillTipX + flameLen,
        drillTipY,
        flameLen + 8,
      );

      if (inSweet) {
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.2, '#00f0ff');
        flameGrad.addColorStop(0.5, '#ffaa00');
        flameGrad.addColorStop(1, 'rgba(255, 30, 0, 0)');
      } else {
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.3, '#ffaa00');
        flameGrad.addColorStop(0.7, '#ff3300');
        flameGrad.addColorStop(1, 'rgba(180, 0, 0, 0)');
      }

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.ellipse(drillTipX + flameLen * 0.4, drillTipY, flameLen, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ── DRAW SMOKE PARTICLES ──
    state.smoke.forEach((smk) => {
      ctx.save();
      ctx.fillStyle = `rgba(160, 175, 195, ${smk.opacity})`;
      ctx.beginPath();
      ctx.arc(smk.x, smk.y, smk.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // ── DRAW SPARK PARTICLES ──
    state.sparks.forEach((spk) => {
      ctx.save();
      ctx.fillStyle = spk.color;
      ctx.shadowColor = spk.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(spk.x, spk.y, spk.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // ── SCREEN SHAKE / OVERHEAT OVERLAY ──
    if (state.overheated) {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(0, 0, w, h);

      // Warning Stencil Across Canvas
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 24px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ OVERHEATED: DRILL BIT JAMMED ⚠', w / 2, 70);
      ctx.restore();
    }
  };

  // Close modal and wrap up
  const handleProceed = () => {
    playSfx('select');
    stopDrillHum();
    if (onSuccess) onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  const inSweetSpot = heat >= SWEET_MIN && heat <= SWEET_MAX;
  const isDangerZone = heat > SWEET_MAX && !isOverheated;
  const heatPercent = Math.round(heat * 100);

  return (
    <div className="thermal-modal-overlay">
      <div className="thermal-modal-backdrop" onClick={isVictory ? handleProceed : onClose} />

      <div className={`thermal-modal-container hud-brackets ${isOverheated ? 'modal-overheated' : ''}`}>
        {/* HEADER BAR */}
        <header className="thermal-header">
          <div className="thermal-title-group">
            <span className="thermal-badge">GTA VI TACTICAL INFILTRATION</span>
            <h2 className="thermal-heading">
              🔥 THERMAL LANCE • SECONDARY VAULT DRILL
            </h2>
          </div>

          <div className="thermal-meta-group">
            {/* Silent Alarm Timer */}
            <div className={`thermal-timer-box ${timeLeft <= 10 ? 'timer-critical' : ''}`}>
              <span className="timer-label">SILENT ALARM</span>
              <span className="timer-digits">00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
            </div>

            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              ✕
            </button>
          </div>
        </header>

        {/* SPECIALIST PERK BANNER */}
        {hasDrillSpecialist && (
          <div className="thermal-specialist-banner">
            <div className="specialist-avatar">
              <img
                src={specialistMember?.portrait || '/images/crew-milo.png'}
                alt="Drill Specialist"
              />
            </div>
            <div className="specialist-info">
              <span className="specialist-name">
                ★ {specialistMember?.name || 'Milo Torque'} — THERMAL LANCE SPECIALIST
              </span>
              <span className="specialist-desc">
                Extended sweet spot (65%–90%) • 25% slower heat buildup • Faster cooldown recovery (2.8s)
              </span>
            </div>
          </div>
        )}

        {/* 60FPS SIMULATION CANVAS */}
        <div className="thermal-canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={800}
            height={480}
            className="thermal-canvas"
            onMouseDown={handleTriggerStart}
            onMouseUp={handleTriggerRelease}
            onMouseLeave={handleTriggerRelease}
            onTouchStart={handleTriggerStart}
            onTouchEnd={handleTriggerRelease}
          />

          {/* IN-CANVAS HUD LABELS */}
          <div className="canvas-hud-corner top-left">
            <span>TARGET: {target?.name || 'OCEAN DRIVE DEPOSIT VAULT'}</span>
            <span>OBJECTIVE: MELT 4 LOCK PINS</span>
          </div>

          <div className="canvas-hud-corner top-right">
            <span>STATUS: {isVictory ? 'SECURED' : isOverheated ? 'COOLDOWN' : isPressing ? 'BORING' : 'READY'}</span>
            <span>PIN: {Math.min(activePin + 1, 4)} / 4</span>
          </div>
        </div>

        {/* HEAT MANAGEMENT HUD BAR */}
        <div className="thermal-gauge-section">
          <div className="thermal-gauge-header">
            <span className="thermal-gauge-title">
              THERMAL CORE TEMPERATURE: <strong className={isOverheated ? 'text-red' : inSweetSpot ? 'text-cyan' : isDangerZone ? 'text-amber' : ''}>{heatPercent}%</strong>
            </span>
            <span className="thermal-gauge-hint">
              {isOverheated
                ? `⚡ JAMMED! COOLING DOWN (${overheatCooldown.toFixed(1)}s)`
                : inSweetSpot
                ? '★ OPTIMAL MELT ZONE (100% MAXIMUM SPEED) — FEATHER TRIGGER! ★'
                : isDangerZone
                ? '⚠ DANGER: REDLINE IMMINENT — RELEASE TRIGGER!'
                : 'HOLD TRIGGER TO HEAT UP DRILL'}
            </span>
          </div>

          {/* THERMAL BAR CONTAINER */}
          <div className="thermal-bar-track">
            {/* Sweet Spot Highlight Zone */}
            <div
              className="thermal-sweet-zone"
              style={{
                left: `${SWEET_MIN * 100}%`,
                width: `${(SWEET_MAX - SWEET_MIN) * 100}%`,
              }}
            >
              <span className="sweet-zone-label">SWEET SPOT ({Math.round(SWEET_MIN * 100)}%–{Math.round(SWEET_MAX * 100)}%)</span>
            </div>

            {/* Dynamic Heat Fill */}
            <div
              className={`thermal-bar-fill ${
                isOverheated
                  ? 'fill-overheated'
                  : inSweetSpot
                  ? 'fill-sweet'
                  : isDangerZone
                  ? 'fill-danger'
                  : 'fill-normal'
              }`}
              style={{ width: `${heatPercent}%` }}
            />

            {/* Overheat Limit Marker */}
            <div className="thermal-overheat-line" title="100% Overheat Limit" />
          </div>
        </div>

        {/* INTERACTIVE TRIGGER ACTION CONTROL */}
        <div className="thermal-controls-bar">
          <div className="thermal-control-tips">
            <span className="tip-badge">CONTROLS</span>
            <span>
              Hold <strong>[SPACE]</strong> or <strong>Left-Click / Tap Button</strong> below to drill. Feather the trigger to stay between {Math.round(SWEET_MIN * 100)}%–{Math.round(SWEET_MAX * 100)}%!
            </span>
          </div>

          {!isVictory ? (
            <button
              type="button"
              className={`btn btn-large thermal-trigger-btn ${
                isOverheated
                  ? 'btn-danger btn-disabled'
                  : isPressing
                  ? 'btn-active'
                  : inSweetSpot
                  ? 'btn-sweet'
                  : 'btn-primary'
              }`}
              onMouseDown={handleTriggerStart}
              onMouseUp={handleTriggerRelease}
              onMouseLeave={handleTriggerRelease}
              onTouchStart={handleTriggerStart}
              onTouchEnd={handleTriggerRelease}
              disabled={isOverheated || isAlarmTripped}
            >
              {isOverheated
                ? `⚡ OVERHEATED (COOLING ${overheatCooldown.toFixed(1)}s)`
                : isPressing
                ? '🔥 DRILLING ENGAGED (FEATHER TRIGGER!)'
                : '🔥 HOLD TO APPLY PLASMA DRILL'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-large thermal-victory-btn"
              onClick={handleProceed}
            >
              💎 CLAIM ANTIQUE JEWELRY & CONTINUE (+$350K)
            </button>
          )}
        </div>

        {/* VICTORY MODAL OVERLAY */}
        {isVictory && (
          <div className="thermal-victory-overlay">
            <div className="victory-card hud-brackets">
              <span className="victory-tag">HEIST PAYOUT BOOST UNLOCKED</span>
              <h3 className="victory-title">SECONDARY DEPOSIT BOXES MELTED</h3>
              <p className="victory-desc">
                All 4 titanium vault pins successfully severed with zero structural alarms tripped.
              </p>

              <div className="victory-rewards-grid">
                <div className="reward-box">
                  <span className="reward-label">EXTRA LOOT</span>
                  <span className="reward-val text-gold">+$350,000</span>
                  <span className="reward-sub">Antique Jewelry & Diamonds</span>
                </div>

                <div className="reward-box">
                  <span className="reward-label">MISSION BONUS</span>
                  <span className="reward-val text-cyan">+15% SCORE</span>
                  <span className="reward-sub">Mastermind Execution Bonus</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-large"
                onClick={handleProceed}
              >
                STAMP TO MISSION DOSSIER ➔
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
