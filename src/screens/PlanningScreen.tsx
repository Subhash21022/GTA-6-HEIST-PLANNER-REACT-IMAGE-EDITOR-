import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore } from '../store';
import { COPY } from '../config/copy';
import { renderBlueprint, drawSampleRoute } from '../render/blueprint';
import { renderGetawayMap, drawSampleGetawayRoute } from '../render/map';
import { analyseInfiltration, analyseGetaway, type AnalysisResult } from '../analysis';
import { EditorModal } from '../editor/EditorModal';
import { PLANNING_TOOLS } from '../editor/toolConfigs';
import { normaliseImageToSize, dataUrlToImageData, createCanvas, canvasToDataUrl, getImageData } from '../utils/canvas';
import './PlanningScreen.css';

interface PlanningScreenProps {
  stage: 'infiltration' | 'getaway';
}

export function PlanningScreen({ stage }: PlanningScreenProps) {
  const target = useStore((s) => s.target);
  const crew = useStore((s) => s.crew);
  const goBack = useStore((s) => s.goBack);
  const setScreen = useStore((s) => s.setScreen);
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

    if (target.blueprintImage) {
      let cancelled = false;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        const w = target.layout.canvasWidth;
        const h = target.layout.canvasHeight;
        const [canvas, ctx] = createCanvas(w, h);
        ctx.drawImage(img, 0, 0, w, h);
        setBase({ dataUrl: canvasToDataUrl(canvas), imageData: getImageData(canvas, ctx) });
      };
      img.onerror = () => {
        if (cancelled) return;
        const result = renderBlueprint(target.layout, target.name);
        setBase(result);
      };
      img.src = target.blueprintImage;
      return () => { cancelled = true; };
    }

    setBase(renderBlueprint(target.layout, target.name));
  }, [target, isInfiltration]);

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
          result = analyseInfiltration(baseData, editedData, target.layout, crewModifierIds);
          setInfiltrationImage(normalised);
          setInfiltrationResult(result);
        } else {
          result = analyseGetaway(baseData, editedData, target.getaway, crewModifierIds);
          setGetawayImage(normalised);
          setGetawayResult(result);
        }
        persistState();
        addToast(COPY.saved);
      } finally {
        setAnalysing(false);
      }
    },
    [target, base, crew, isInfiltration, setInfiltrationImage, setInfiltrationResult, setGetawayImage, setGetawayResult, persistState, addToast],
  );

  const handleEditorCancel = useCallback(() => {
    setEditorOpen(false);
  }, []);

  const handleReset = useCallback(() => {
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
    const layout = isInfiltration ? target.layout : target.getaway;
    const route = isInfiltration ? target.layout.sampleRoute : target.getaway.sampleRoute;
    const crewModifierIds = crew.map((c) => c.modifierId);
    let sampleDataUrl: string;
    if (isInfiltration) {
      sampleDataUrl = await drawSampleRoute(base.dataUrl, route, layout.canvasWidth, layout.canvasHeight);
    } else {
      sampleDataUrl = await drawSampleGetawayRoute(base.dataUrl, route, layout.canvasWidth, layout.canvasHeight);
    }
    setAnalysing(true);
    try {
      const normalised = await normaliseImageToSize(sampleDataUrl, layout.canvasWidth, layout.canvasHeight);
      const editedImageData = await dataUrlToImageData(normalised, layout.canvasWidth, layout.canvasHeight);
      const baseData = base.imageData.data;
      const editedData = editedImageData.data;
      let result: AnalysisResult;
      if (isInfiltration) {
        result = analyseInfiltration(baseData, editedData, target.layout, crewModifierIds);
        setInfiltrationImage(normalised);
        setInfiltrationResult(result);
      } else {
        result = analyseGetaway(baseData, editedData, target.getaway, crewModifierIds);
        setGetawayImage(normalised);
        setGetawayResult(result);
      }
      persistState();
      addToast(COPY.saved);
    } finally {
      setAnalysing(false);
    }
  }, [target, base, crew, isInfiltration, setInfiltrationImage, setInfiltrationResult, setGetawayImage, setGetawayResult, persistState, addToast]);

  const handleContinue = useCallback(() => {
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
        <button className="btn btn-ghost" onClick={goBack} type="button">
          {COPY.back}
        </button>
        <h2 className="screen-title">
          {isInfiltration ? 'INFILTRATION PLAN' : 'GETAWAY ROUTE'}
        </h2>
        <div />
      </header>

      <div className="planning-layout">
        <div className="planning-preview">
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
                    Enter via an entry point
                  </li>
                  <li className={currentResult?.connectivity.vaultReached ? 'done' : ''}>
                    Reach the vault
                  </li>
                  <li className={currentResult?.connectivity.exitReached ? 'done' : ''}>
                    Escape through an exit
                  </li>
                  <li>Avoid cameras and patrols</li>
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
    </div>
  );
}
