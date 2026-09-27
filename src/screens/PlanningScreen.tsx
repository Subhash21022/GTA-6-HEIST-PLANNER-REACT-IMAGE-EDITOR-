import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore } from '../store';
import { COPY } from '../config/copy';
import { renderBlueprint, drawApproachOverlays, drawSampleRoute } from '../render/blueprint';
import { renderGetawayMap, drawSampleGetawayRoute } from '../render/map';
import { renderSatelliteOrthophoto } from '../render/satellite';
import { analyseInfiltration, analyseGetaway, type AnalysisResult } from '../analysis';
import { EditorModal } from '../editor/EditorModal';
import { SafeCrackerModal } from '../ui/SafeCrackerModal';
import { ThermalDrillModal } from '../ui/ThermalDrillModal';
import { SatelliteReconModal } from '../ui/SatelliteReconModal';
import { PLANNING_TOOLS } from '../editor/toolConfigs';
import { normaliseImageToSize, dataUrlToImageData, createCanvas, canvasToDataUrl, getImageData } from '../utils/canvas';
import { playSfx } from '../audio/soundManager';
import './PlanningScreen.css';

interface PlanningScreenProps {
  stage: 'infiltration' | 'getaway';
}

export function PlanningScreen({ stage }: PlanningScreenProps) {
  const target = useStore((s) => s.target);
  const approach = useStore((s) => s.approach);
  const crew = useStore((s) => s.crew);
  const goBack = useStore((s) => s.goBack);
  const setScreen = useStore((s) => s.setScreen);
  const safeCracked = useStore((s) => s.safeCracked);
  const thermalDrilled = useStore((s) => s.thermalDrilled);
  const satelliteReconCompleted = useStore((s) => s.satelliteReconCompleted);
  const addToast = useStore((s) => s.addToast);
  const persistState = useStore((s) => s.persistState);

  const setInfiltrationImage = useStore((s) => s.setInfiltrationImage);
  const setInfiltrationResult = useStore((s) => s.setInfiltrationResult);
  const setGetawayImage = useStore((s) => s.setGetawayImage);
  const setGetawayResult = useStore((s) => s.setGetawayResult);

  const currentImage = useStore((s) =>
    stage === 'infiltration' ? s.infiltrationImage : s.getawayImage,
  );
  const currentResult = useStore((s) =>
    stage === 'infiltration' ? s.infiltrationResult : s.getawayResult,
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [safeModalOpen, setSafeModalOpen] = useState(false);
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [satelliteModalOpen, setSatelliteModalOpen] = useState(false);
  const [intelViewMode, setIntelViewMode] = useState<'blueprint' | 'optical' | 'flir'>('blueprint');
  const [analysing, setAnalysing] = useState(false);
  const [base, setBase] = useState<{ dataUrl: string; imageData: ImageData } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);

  const isInfiltration = stage === 'infiltration';

  useEffect(() => {
    if (!target) { setBase(null); return; }

    if (!isInfiltration) {
      const result = renderGetawayMap(target.getaway, target.name);
      setBase({ dataUrl: result.dataUrl, imageData: result.imageData });
      return;
    }

    if (intelViewMode === 'optical') {
      const sat = renderSatelliteOrthophoto(target, 'optical');
      setBase(sat);
      return;
    }

    if (intelViewMode === 'flir') {
      const sat = renderSatelliteOrthophoto(target, 'flir');
      setBase(sat);
      return;
    }

    if (target.blueprintImage) {
      let cancelled = false;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        const w = target.layout.canvasWidth;
        const h = target.layout.canvasHeight;
        const [canvas, ctx] = createCanvas(w, h);
        ctx.drawImage(img, 0, 0, w, h);
        drawApproachOverlays(ctx, target.layout, approach);
        setBase({ dataUrl: canvasToDataUrl(canvas), imageData: getImageData(canvas, ctx) });
      };
      img.onerror = () => {
        if (cancelled) return;
        const result = renderBlueprint(target.layout, target.name, approach);
        setBase(result);
      };
      img.src = target.blueprintImage;
      return () => { cancelled = true; };
    }

    setBase(renderBlueprint(target.layout, target.name, approach));
  }, [target, isInfiltration, approach, intelViewMode]);

  useGSAP(() => {
    const ctx = containerRef.current;
    if (!ctx) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(ctx.querySelector('.screen-header'),
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' },
      );

      gsap.fromTo(ctx.querySelector('.blueprint-frame'),
        { opacity: 0, scale: 0.97 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out', delay: 0.15 },
      );

      gsap.fromTo(ctx.querySelector('.planning-sidebar'),
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.3 },
      );
    });
  }, { scope: containerRef, dependencies: [stage] });

  useEffect(() => {
    if (currentResult && scoreRef.current) {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(scoreRef.current, { innerText: '0' }, {
          innerText: currentResult.score,
          snap: { innerText: 1 },
          duration: 1.2,
          ease: 'power2.out',
        });
      });
    }
  }, [currentResult]);

  const handleEditorSave = useCallback(
    async ({ dataUrl }: { dataUrl: string; blob: Blob }) => {
      if (!target || !base) return;
      setEditorOpen(false);
      setAnalysing(true);
      try {
        const layout = isInfiltration ? target.layout : target.getaway;
        const crewModifierIds = crew.map((c) => c.modifierId);
        const normalised = await normaliseImageToSize(
          dataUrl,
          layout.canvasWidth,
          layout.canvasHeight,
        );
        const editedImageData = await dataUrlToImageData(
          normalised,
          layout.canvasWidth,
          layout.canvasHeight,
        );
        const baseData = base.imageData.data;
        const editedData = editedImageData.data;

        let result: AnalysisResult;
        if (isInfiltration) {
          result = analyseInfiltration(baseData, editedData, target.layout, crewModifierIds, approach);
          setInfiltrationImage(normalised);
          setInfiltrationResult(result);
        } else {
          result = analyseGetaway(baseData, editedData, target.getaway, crewModifierIds);
          setGetawayImage(normalised);
          setGetawayResult(result);
        }
        playSfx('pin');
        persistState();
        addToast(COPY.saved);
      } finally {
        setAnalysing(false);
      }
    },
    [target, base, crew, isInfiltration, approach, setInfiltrationImage, setInfiltrationResult, setGetawayImage, setGetawayResult, persistState, addToast],
  );

  const handleEditorCancel = useCallback(() => {
    setEditorOpen(false);
  }, []);

  const handleReset = useCallback(() => {
    playSfx('back');
    if (isInfiltration) {
      setInfiltrationImage(null);
      setInfiltrationResult(null);
    } else {
      setGetawayImage(null);
      setGetawayResult(null);
    }
    addToast(COPY.reset);
  }, [isInfiltration, setInfiltrationImage, setInfiltrationResult, setGetawayImage, setGetawayResult, addToast]);

  const handleSample = useCallback(async () => {
    if (!target || !base) return;
    playSfx('string');
    const layout = isInfiltration ? target.layout : target.getaway;
    const route = isInfiltration ? target.layout.sampleRoute : target.getaway.sampleRoute;
    let sampleDataUrl: string;
    if (isInfiltration) {
      sampleDataUrl = await drawSampleRoute(base.dataUrl, route, layout.canvasWidth, layout.canvasHeight);
    } else {
      sampleDataUrl = await drawSampleGetawayRoute(base.dataUrl, route, layout.canvasWidth, layout.canvasHeight);
    }
    const normalised = await normaliseImageToSize(sampleDataUrl, layout.canvasWidth, layout.canvasHeight);
    const editedImageData = await dataUrlToImageData(normalised, layout.canvasWidth, layout.canvasHeight);
    const crewModifierIds = crew.map((c) => c.modifierId);
    let result: AnalysisResult;
    if (isInfiltration) {
      result = analyseInfiltration(base.imageData.data, editedImageData.data, target.layout, crewModifierIds, approach);
      setInfiltrationImage(normalised);
      setInfiltrationResult(result);
    } else {
      result = analyseGetaway(base.imageData.data, editedImageData.data, target.getaway, crewModifierIds);
      setGetawayImage(normalised);
      setGetawayResult(result);
    }
    playSfx('cashTally');
    persistState();
  }, [target, base, crew, isInfiltration, approach, setInfiltrationImage, setInfiltrationResult, setGetawayImage, setGetawayResult, persistState]);

  const handleContinue = useCallback(() => {
    playSfx('select');
    if (isInfiltration) {
      setScreen('getaway');
    } else {
      setScreen('playback');
    }
  }, [isInfiltration, setScreen]);

  if (!target || !base) return null;

  const displayImage = currentImage ?? base.dataUrl;

  return (
    <div className="planning-screen" ref={containerRef}>
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
        <h2 className="screen-title">
          {isInfiltration ? 'INFILTRATION PLAN' : 'GETAWAY ROUTE'}
        </h2>
        <div />
      </header>

      <div className="planning-layout">
        <div className="planning-preview">
          {isInfiltration && (
            <div className={`approach-indicator-banner ${approach}`}>
              <span className="approach-indicator-tag">
                {approach === 'subtle' ? '🤫 THE SUBTLE ROUTE' : '💣 THE LOUD ROUTE'}
              </span>
              <span className="approach-indicator-desc">
                {approach === 'subtle'
                  ? 'Silent Ingress • Bypass CCTV Cones • Use Service & Air Ducts'
                  : 'C4 Kinetic Entry • Rapid Vault Detonation • SWAT Chokepoint Firefights'}
              </span>
            </div>
          )}

          {isInfiltration && (
            <div className="blueprint-intel-switcher hud-brackets">
              <span className="intel-switcher-title">TACTICAL VIEW:</span>
              <div className="intel-switcher-btns">
                <button
                  type="button"
                  className={`btn btn-xs ${intelViewMode === 'blueprint' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    playSfx('tab');
                    setIntelViewMode('blueprint');
                  }}
                >
                  📄 CAD BLUEPRINT
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${intelViewMode === 'optical' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    playSfx('satelliteSpectrumSwitch', 0.9);
                    setIntelViewMode('optical');
                  }}
                  style={{
                    color: intelViewMode === 'optical' ? '#000' : '#38bdf8',
                    borderColor: '#38bdf8',
                  }}
                >
                  🛰️ OPTICAL SPECTRUM
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${intelViewMode === 'flir' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    playSfx('satelliteSpectrumSwitch', 0.9);
                    setIntelViewMode('flir');
                  }}
                  style={{
                    color: intelViewMode === 'flir' ? '#000' : '#f43f5e',
                    borderColor: '#f43f5e',
                  }}
                >
                  🔥 THERMAL FLIR
                </button>
              </div>
            </div>
          )}

          <div className="blueprint-frame hud-brackets">
            <img
              src={displayImage}
              alt={isInfiltration ? 'Floor plan blueprint' : 'District getaway map'}
              className="blueprint-img"
            />
            {analysing && (
              <div className="blueprint-analysing">
                <div className="editor-modal-spinner" />
                <span>Analysing plan...</span>
              </div>
            )}
          </div>

          <div className="planning-actions">
            <button
              className="btn btn-primary btn-large"
              onClick={() => setEditorOpen(true)}
              type="button"
            >
              {currentImage ? COPY.reopenEditor : COPY.openEditor}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleSample}
              type="button"
            >
              {COPY.sampleButton}
            </button>
            {isInfiltration && (
              <>
                <button
                  className={`btn ${safeCracked ? 'btn-secondary safe-cracked-btn' : 'btn-primary safe-cracker-trigger-btn'}`}
                  onClick={() => {
                    playSfx('select');
                    setSafeModalOpen(true);
                  }}
                  type="button"
                  title="Crack the 3-tumbler vault combination for +$450,000 bonus loot & guaranteed S-Rank"
                >
                  {safeCracked ? '💎 VAULT CRACKED (+$450K)' : '🔐 CRACK VAULT TUMBLER (+ $450K)'}
                </button>
                <button
                  className={`btn ${thermalDrilled ? 'btn-secondary safe-cracked-btn' : 'btn-primary safe-cracker-trigger-btn'}`}
                  onClick={() => {
                    playSfx('select');
                    setDrillModalOpen(true);
                  }}
                  type="button"
                  style={{
                    background: thermalDrilled ? undefined : 'linear-gradient(135deg, #ff5e00 0%, #ff0044 100%)',
                    borderColor: '#ff5e00',
                  }}
                  title="Feather the plasma thermal lance to melt deposit box pins for +$350,000 & +15% mission score"
                >
                  {thermalDrilled ? '🔥 DEPOSIT BOXES MELTED (+$350K)' : '🔥 THERMAL LANCE DRILL (+ $350K & +15%)'}
                </button>
                <button
                  className={`btn ${satelliteReconCompleted ? 'btn-secondary safe-cracked-btn' : 'btn-secondary'}`}
                  onClick={() => {
                    playSfx('satelliteDownlinkChime');
                    setSatelliteModalOpen(true);
                  }}
                  type="button"
                  style={{
                    borderColor: '#00f0ff',
                    color: '#00f0ff',
                    boxShadow: satelliteReconCompleted ? undefined : '0 0 12px rgba(0, 240, 255, 0.25)',
                  }}
                  title="Launch military orbital KH-12 spy satellite multi-spectral feed in React Image Editor"
                >
                  {satelliteReconCompleted ? '🛰️ SATELLITE INTEL LOCKED (+$250K)' : '🛰️ SATELLITE FLIR (+ $250K)'}
                </button>
              </>
            )}
            {currentImage && (
              <button
                className="btn btn-ghost"
                onClick={handleReset}
                type="button"
              >
                {COPY.resetBlueprint}
              </button>
            )}
          </div>
        </div>

        <aside className="planning-sidebar">
          <div className="mission-panel glass-panel">
            <h3>Mission Objectives</h3>
            <ul className="objectives-list">
              {isInfiltration ? (
                <>
                  <li className={currentResult?.connectivity.entryReached ? 'done' : ''}>
                    {approach === 'subtle' ? 'Enter via service/vent access' : 'Enter via C4 breach/door point'}
                  </li>
                  <li className={currentResult?.connectivity.vaultReached ? 'done' : ''}>
                    {approach === 'subtle' ? 'Crack the vault lock silently' : 'Detonate & breach the vault'}
                  </li>
                  <li className={safeCracked ? 'done' : ''}>
                    {safeCracked ? 'Vault safe cracked: S-Rank secured (+$450K)' : 'Optional: Crack vault tumbler (+ $450K)'}
                  </li>
                  <li className={thermalDrilled ? 'done' : ''}>
                    {thermalDrilled ? 'Deposit boxes melted: +$350K & +15% Score' : 'Optional: Thermal lance deposit drill (+ $350K)'}
                  </li>
                  <li className={satelliteReconCompleted ? 'done' : ''}>
                    {satelliteReconCompleted ? 'Orbital satellite reconnaissance: Locked (+$250K)' : 'Optional: Orbital satellite FLIR recon (+ $250K)'}
                  </li>
                  <li className={currentResult?.connectivity.exitReached ? 'done' : ''}>
                    Escape through an exit corridor
                  </li>
                  <li>
                    {approach === 'subtle' ? 'Avoid CCTV cones & alert patrols' : 'Suppress SWAT chokepoints & exfiltrate fast'}
                  </li>
                </>
              ) : (
                <>
                  <li className={currentResult?.connectivity.entryReached ? 'done' : ''}>
                    Start from the target building
                  </li>
                  <li className={currentResult?.connectivity.vaultReached ? 'done' : ''}>
                    Reach the safehouse
                  </li>
                  <li>Avoid police roadblocks</li>
                </>
              )}
            </ul>
          </div>

          {currentResult && (
            <div className="results-panel glass-panel">
              <h3>Analysis Results</h3>
              <div className="score-display">
                <span className="score-value" ref={scoreRef}>{currentResult.score}</span>
                <span className="score-grade" data-grade={currentResult.grade}>
                  {currentResult.grade}
                </span>
              </div>
              <div className="findings-list">
                {currentResult.findings.map((f, i) => (
                  <div key={i} className={`finding finding-${f.type}`}>
                    <span className="finding-icon">
                      {f.type === 'success' ? '✓' : f.type === 'warning' ? '⚠' : '✗'}
                    </span>
                    {f.message}
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary btn-large planning-continue"
                onClick={handleContinue}
                type="button"
              >
                {COPY.continueNext}
              </button>
            </div>
          )}
        </aside>
      </div>

      <div className="editor-powered-badge">
        Route planning powered by React Image Editor
      </div>

      {editorOpen && (
        <EditorModal
          title={isInfiltration ? 'Infiltration Planning Table' : 'Getaway Route Planning'}
          image={displayImage}
          tools={PLANNING_TOOLS}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}

      <SafeCrackerModal
        isOpen={safeModalOpen}
        onClose={() => setSafeModalOpen(false)}
        onSuccess={() => setSafeModalOpen(false)}
      />

      <ThermalDrillModal
        isOpen={drillModalOpen}
        onClose={() => setDrillModalOpen(false)}
        onSuccess={() => setDrillModalOpen(false)}
      />

      <SatelliteReconModal
        isOpen={satelliteModalOpen}
        onClose={() => setSatelliteModalOpen(false)}
      />
    </div>
  );
}
