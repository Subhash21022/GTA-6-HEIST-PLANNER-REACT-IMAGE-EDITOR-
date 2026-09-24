import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore } from '../store';
import { COPY } from '../config/copy';
import { ANALYSIS } from '../config/scoring';
import { PALETTE } from '../config/theme';
import type { AnalysisResult } from '../analysis/scoring';
import { calculateWantedLevel } from '../config/wantedLevel';
import { WantedStars } from '../ui/WantedStars';
import './PlaybackScreen.css';

interface PlaybackEvent {
  time: number;
  message: string;
  type: 'info' | 'hazard' | 'success';
}

function buildEvents(
  result: AnalysisResult | null,
  isGetaway: boolean,
  approach: 'subtle' | 'loud' = 'subtle',
): PlaybackEvent[] {
  if (!result) return [];
  const events: PlaybackEvent[] = [];
  const { crossings, connectivity } = result;
  const pathLen = (result as any).path?.length || connectivity?.path?.length || 0;

  if (connectivity.entryReached) {
    events.push({
      time: 0,
      message: isGetaway
        ? 'Getaway: Leaving the target building'
        : approach === 'subtle'
        ? 'Silent Ingress: Service & vent access cleared'
        : 'Kinetic Entry: C4 structural wall breach detonated!',
      type: 'info',
    });
  }

  for (const c of crossings) {
    const t = pathLen > 0 ? c.pathIndex / pathLen : 0;
    const isCam = c.hazardId.startsWith('C');
    if (approach === 'loud' && !isGetaway && isCam) {
      events.push({
        time: t,
        message: `${c.hazardLabel}: camera disregarded (loud breach)`,
        type: 'info',
      });
    } else {
      events.push({
        time: t,
        message: `${c.hazardLabel}: exposure detected`,
        type: 'hazard',
      });
    }
  }

  if (connectivity.vaultReached) {
    events.push({
      time: isGetaway ? 1 : 0.5,
      message: isGetaway
        ? COPY.exitReached
        : approach === 'subtle'
        ? 'Vault: Biometric lock cracked silently'
        : 'Vault: Heavy thermal lance blast through vault!',
      type: 'success',
    });
  }

  if (connectivity.exitReached && !isGetaway) {
    events.push({
      time: 1,
      message: approach === 'subtle'
        ? 'Exit reached — clean ghost exfiltration!'
        : 'Exit reached — perimeter breached into getaway vehicle!',
      type: 'success',
    });
  }

  if (!connectivity.vaultReached && !connectivity.exitReached) {
    events.push({
      time: 1,
      message: COPY.planIncomplete,
      type: 'hazard',
    });
  }

  events.sort((a, b) => a.time - b.time);
  return events;
}

const STAGE_DURATION = 4000;

export function PlaybackScreen() {
  const infiltrationImage = useStore((s) => s.infiltrationImage);
  const infiltrationResult = useStore((s) => s.infiltrationResult);
  const getawayImage = useStore((s) => s.getawayImage);
  const getawayResult = useStore((s) => s.getawayResult);
  const setScreen = useStore((s) => s.setScreen);
  const goBack = useStore((s) => s.goBack);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'infiltration' | 'getaway' | 'done'>('infiltration');
  const [logEntries, setLogEntries] = useState<PlaybackEvent[]>([]);
  const [skipped, setSkipped] = useState(false);
  const animRef = useRef(0);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useGSAP(() => {
    const ctx = containerRef.current;
    if (!ctx) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(ctx.querySelector('.screen-header'),
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' },
      );
    });
  }, { scope: containerRef });

  const shakeCanvas = useCallback(() => {
    if (canvasWrapRef.current && !prefersReducedMotion.current) {
      gsap.to(canvasWrapRef.current, {
        x: '+=3',
        yoyo: true,
        repeat: 5,
        duration: 0.04,
        ease: 'power1.inOut',
        onComplete() {
          gsap.set(canvasWrapRef.current, { x: 0 });
        },
      });
    }
  }, []);

  const approach = useStore((s) => s.approach);
  const crew = useStore((s) => s.crew);

  const wantedInfo = useMemo(() => {
    return calculateWantedLevel(approach, infiltrationResult, getawayResult, crew);
  }, [approach, infiltrationResult, getawayResult, crew]);

  const drawPlayback = useCallback(
    (
      bgImage: string,
      path: [number, number][],
      events: PlaybackEvent[],
      onComplete: () => void,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        if (prefersReducedMotion.current || skipped) {
          ctx.drawImage(img, 0, 0);
          drawFullPath(ctx, path);
          setLogEntries((prev) => [...prev, ...events]);
          onComplete();
          return;
        }

        const startTime = performance.now();
        const firedEvents = new Set<number>();

        const animate = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / STAGE_DURATION);

          ctx.drawImage(img, 0, 0);

          const idx = Math.max(0, Math.min(path.length - 1, Math.floor(progress * (path.length - 1))));

          if (path.length > 1 && path[idx] && path[0]) {
            const isSubtleInfil = phase === 'infiltration' && approach === 'subtle';
            ctx.strokeStyle = isSubtleInfil ? 'rgba(0, 240, 255, 0.75)' : PALETTE.routeTrail;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(
              path[0][0] * ANALYSIS.cellSize + ANALYSIS.cellSize / 2,
              path[0][1] * ANALYSIS.cellSize + ANALYSIS.cellSize / 2,
            );
            for (let i = 1; i <= idx; i++) {
              if (path[i]) {
                ctx.lineTo(
                  path[i][0] * ANALYSIS.cellSize + ANALYSIS.cellSize / 2,
                  path[i][1] * ANALYSIS.cellSize + ANALYSIS.cellSize / 2,
                );
              }
            }
            ctx.stroke();

            const cx = path[idx][0] * ANALYSIS.cellSize + ANALYSIS.cellSize / 2;
            const cy = path[idx][1] * ANALYSIS.cellSize + ANALYSIS.cellSize / 2;

            const glowColor = isSubtleInfil ? PALETTE.cyan : PALETTE.hotPink;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 20;
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.arc(cx, cy, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.globalAlpha = 0.3 + 0.2 * Math.sin(now * 0.01);
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          for (let e = 0; e < events.length; e++) {
            if (progress >= events[e].time && !firedEvents.has(e)) {
              firedEvents.add(e);
              setLogEntries((prev) => [...prev, events[e]]);
              if (events[e].type === 'hazard') {
                shakeCanvas();
              }
            }
          }

          if (progress < 1) {
            animRef.current = requestAnimationFrame(animate);
          } else {
            drawFullPath(ctx, path);
            onComplete();
          }
        };

        animRef.current = requestAnimationFrame(animate);
      };
      img.src = bgImage;
    },
    [skipped, shakeCanvas, phase, approach],
  );

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    if (phase === 'infiltration' && infiltrationImage && infiltrationResult) {
      const events = buildEvents(infiltrationResult, false, approach);
      drawPlayback(infiltrationImage, infiltrationResult.path, events, () => {
        setTimeout(() => setPhase('getaway'), 800);
      });
    } else if (phase === 'infiltration') {
      setTimeout(() => setPhase('getaway'), 0);
    }
  }, [phase, infiltrationImage, infiltrationResult, approach, drawPlayback]);

  useEffect(() => {
    if (phase === 'getaway' && getawayImage && getawayResult) {
      const events = buildEvents(getawayResult, true, approach);
      drawPlayback(getawayImage, getawayResult.path, events, () => {
        setTimeout(() => setPhase('done'), 800);
      });
    } else if (phase === 'getaway') {
      setTimeout(() => setPhase('done'), 0);
    }
  }, [phase, getawayImage, getawayResult, approach, drawPlayback]);

  const handleSkip = () => {
    setSkipped(true);
    cancelAnimationFrame(animRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentImgSrc = phase === 'infiltration' ? infiltrationImage : getawayImage;
    const currentPath = phase === 'infiltration' ? infiltrationResult?.path : getawayResult?.path;
    const currentResult = phase === 'infiltration' ? infiltrationResult : getawayResult;

    if (currentImgSrc && currentPath && currentResult) {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        drawFullPath(ctx, currentPath);
        const events = buildEvents(currentResult, phase === 'getaway', approach);
        setLogEntries((prev) => [...prev, ...events]);
      };
      img.src = currentImgSrc;
    }

    setPhase('done');
  };

  const handleContinue = () => {
    setScreen('briefing');
  };

  return (
    <div className="playback-screen" ref={containerRef}>
      <header className="screen-header">
        <button className="btn btn-ghost" onClick={goBack} type="button">
          {COPY.back}
        </button>
        <div className="playback-header-center">
          <h2 className="screen-title">
            {phase === 'infiltration'
              ? (approach === 'subtle' ? 'STEALTH INFILTRATION' : 'KINETIC BREACH')
              : 'HEIST PLAYBACK'}
          </h2>
          <WantedStars wantedInfo={wantedInfo} size="sm" showDetails={false} />
        </div>
        <div />
      </header>

      <div className="playback-layout">
        <div className="playback-canvas-wrap hud-brackets" ref={canvasWrapRef}>
          <canvas ref={canvasRef} className="playback-canvas" aria-label="Plan playback animation" role="img" />
          <div className="playback-phase-label">
            {phase === 'infiltration' && (approach === 'subtle' ? 'INFILTRATION (SUBTLE)' : 'INFILTRATION (LOUD)')}
            {phase === 'getaway' && 'GETAWAY ROUTE'}
            {phase === 'done' && 'COMPLETE'}
          </div>
        </div>

        <aside className="playback-log glass-panel">
          <h3>Event Log</h3>
          <div className="log-entries">
            {logEntries.map((e, i) => (
              <div key={i} className={`log-entry log-${e.type}`}>
                <span className="log-dot" />
                {e.message}
              </div>
            ))}
          </div>

          <div className="playback-actions">
            {phase !== 'done' && (
              <button className="btn btn-ghost" onClick={handleSkip} type="button">
                Skip
              </button>
            )}
            {phase === 'done' && (
              <button
                className="btn btn-primary btn-large"
                onClick={handleContinue}
                type="button"
              >
                {COPY.continueNext}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function drawFullPath(ctx: CanvasRenderingContext2D, path: [number, number][]): void {
  if (path.length < 2) return;
  ctx.strokeStyle = PALETTE.routeTrail;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(
    path[0][0] * ANALYSIS.cellSize + ANALYSIS.cellSize / 2,
    path[0][1] * ANALYSIS.cellSize + ANALYSIS.cellSize / 2,
  );
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(
      path[i][0] * ANALYSIS.cellSize + ANALYSIS.cellSize / 2,
      path[i][1] * ANALYSIS.cellSize + ANALYSIS.cellSize / 2,
    );
  }
  ctx.stroke();
}
