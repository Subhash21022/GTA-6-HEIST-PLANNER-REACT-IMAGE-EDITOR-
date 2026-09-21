import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore } from '../store';
import { COPY } from '../config/copy';
import { downloadDataUrl, copyImageToClipboard, createCanvas, canvasToDataUrl, normaliseImageToSize } from '../utils/canvas';
import { createNewsRightPanel, renderLiveNewsFrame } from '../render/news';
import { renderCCTVFrame, CCTV_CAMERAS } from '../render/cctv';
import { recordCanvasVideo, downloadVideoBlob, isVideoRecordingSupported } from '../utils/videoRecorder';
import { EditorModal } from '../editor/EditorModal';
import { NEWS_TOOLS, CCTV_EVIDENCE_TOOLS, type ToolsConfig } from '../editor/toolConfigs';
import type { ImageEditorSaveResult } from '@unlayer/react-image-editor';
import { playSfx } from '../audio/soundManager';
import { pursuitAudio } from '../audio/pursuitAudio';
import './ResultScreen.css';

const NEWS_W = 1920;
const NEWS_H = 1080;

export function ResultScreen() {
  const finalImage = useStore((s) => s.finalImage);
  const codename = useStore((s) => s.codename);
  const target = useStore((s) => s.target);
  const crew = useStore((s) => s.crew);
  const infiltrationResult = useStore((s) => s.infiltrationResult);
  const getawayResult = useStore((s) => s.getawayResult);
  const customCrewPortraits = useStore((s) => s.customCrewPortraits);
  const approach = useStore((s) => s.approach);
  const setNewsHeadlineImage = useStore((s) => s.setNewsHeadlineImage);
  const startOver = useStore((s) => s.startOver);
  const addToast = useStore((s) => s.addToast);
  const containerRef = useRef<HTMLDivElement>(null);

  const grade = infiltrationResult?.grade ?? getawayResult?.grade ?? 'F';
  const approved = (infiltrationResult?.approved ?? false) || (getawayResult?.approved ?? false);
  const score = infiltrationResult?.score ?? getawayResult?.score ?? 0;

  const [activeTab, setActiveTab] = useState<'briefing' | 'news'>('briefing');
  const [cameraIndex, setCameraIndex] = useState(0); // Default to CAM 01 Sky-Weazel Live Pursuit
  const [isLivePlaying, setIsLivePlaying] = useState(true);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  // React Image Editor integration state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTarget, setEditorTarget] = useState<'cctv' | 'fullNews'>('cctv');
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorTools, setEditorTools] = useState<ToolsConfig>(CCTV_EVIDENCE_TOOLS);
  const [annotatedCctvFrame, setAnnotatedCctvFrame] = useState<string | null>(null);

  // Live broadcast rendering refs
  const liveNewsCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightPanelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const annotatedImgRef = useRef<HTMLImageElement | null>(null);
  const animFrameIdRef = useRef<number>(0);
  const timeMsRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  useGSAP(() => {
    const ctx = containerRef.current;
    if (!ctx) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl.fromTo(ctx.querySelector('.result-stamp'),
        { scale: 3.5, opacity: 0, rotation: -35 },
        { scale: 1, opacity: 1, rotation: -8, duration: 0.7, ease: 'back.out(2.4)' },
      );

      tl.to(ctx, {
        x: '+=2', yoyo: true, repeat: 3, duration: 0.05, ease: 'power1.inOut',
      }, '-=0.1');
      tl.set(ctx, { x: 0 });

      tl.fromTo(ctx.querySelector('.result-meta'),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        '-=0.2',
      );

      tl.fromTo(ctx.querySelector('.result-tabs'),
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        '-=0.3',
      );

      tl.fromTo(ctx.querySelector('.result-image-wrap'),
        { opacity: 0, scale: 0.97, filter: 'blur(4px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.8 },
        '-=0.3',
      );

      tl.fromTo(ctx.querySelector('.result-actions'),
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        '-=0.3',
      );

      const scoreEl = ctx.querySelector('.result-score');
      if (scoreEl) {
        gsap.fromTo(scoreEl, { innerText: '0' }, {
          innerText: score,
          snap: { innerText: 1 },
          duration: 1.4,
          ease: 'power2.out',
          delay: 0.5,
        });
      }
    });
  }, { scope: containerRef });

  // Play GTA 5 Mission Passed fanfare on screen mount
  useEffect(() => {
    playSfx('missionPassed');
  }, []);

  // Ambient Pursuit Audio (Sky-Weazel news chopper rotor blades & police sirens)
  useEffect(() => {
    if (activeTab === 'news' && cameraIndex === 0 && isLivePlaying) {
      pursuitAudio.start();
    } else {
      pursuitAudio.stop();
    }
    return () => {
      pursuitAudio.stop();
    };
  }, [activeTab, cameraIndex, isLivePlaying]);

  // Animate tab switch
  useGSAP(() => {
    const wrap = containerRef.current?.querySelector('.result-image-wrap');
    if (!wrap) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(wrap,
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' },
      );
    });
  }, { scope: containerRef, dependencies: [activeTab] });

  // Pre-render the static right panel (suspects polaroids & score) once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const panel = await createNewsRightPanel(crew, customCrewPortraits, score, grade);
      if (!cancelled) {
        rightPanelCanvasRef.current = panel;
      }
    })();
    return () => { cancelled = true; };
  }, [crew, customCrewPortraits, score, grade]);

  // Live Television News Broadcast Animation Loop (30-60 FPS)
  useEffect(() => {
    if (activeTab !== 'news') {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const canvas = liveNewsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTickRef.current = performance.now();

    const loop = (now: number) => {
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (isLivePlaying && delta > 0 && delta < 200) {
        timeMsRef.current += delta;
      }

      // Synchronize live pursuit tire screech & backfires with audio engine
      if (activeTab === 'news' && cameraIndex === 0 && isLivePlaying) {
        const cycleT = (timeMsRef.current / 1000) % 10.0;
        const isDrifting = cycleT >= 3.3 && cycleT < 6.0;
        const isBraking = cycleT >= 3.0 && cycleT < 3.3;
        const hasFlames = isDrifting || (Math.sin((timeMsRef.current / 1000) * 8) > 0.4);
        pursuitAudio.updateFrame(isDrifting, isBraking, hasFlames);
      }

      renderLiveNewsFrame(ctx, NEWS_W, NEWS_H, {
        timeMs: timeMsRef.current,
        cameraIndex,
        approach,
        targetName: target?.name || 'TARGET FACILITY',
        codename,
        score,
        grade,
        approved,
        crew,
        rightPanelCanvas: rightPanelCanvasRef.current,
        annotatedFrameImg: annotatedImgRef.current,
      });

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [activeTab, isLivePlaying, cameraIndex, approach, target, codename, score, grade, approved, crew]);

  // Handle "Freeze Frame & Enhance" in React Image Editor
  const handleFreezeFrameAndEnhance = useCallback(() => {
    setIsLivePlaying(false);
    playSfx('cameraShutter');
    const splitX = Math.round(NEWS_W * 0.62); // 1190
    const contentH = NEWS_H - 83 - 100; // 897
    const [cctvCanvas, cctvCtx] = createCanvas(splitX, contentH);

    renderCCTVFrame(cctvCtx, splitX, contentH, {
      timeMs: timeMsRef.current,
      cameraIndex,
      approach,
      crew,
      targetName: target?.name || 'TARGET FACILITY',
    });

    const frameUrl = canvasToDataUrl(cctvCanvas);
    setEditorTarget('cctv');
    setEditorImage(frameUrl);
    setEditorTools(CCTV_EVIDENCE_TOOLS);
    setEditorTitle(`CCTV Freeze Frame — ${CCTV_CAMERAS[cameraIndex].label} (${CCTV_CAMERAS[cameraIndex].name})`);
    setEditorOpen(true);
  }, [cameraIndex, approach, crew, target]);

  // Handle "Customise Full Broadcast" in React Image Editor
  const handleCustomiseFullNews = useCallback(() => {
    if (!liveNewsCanvasRef.current) return;
    setIsLivePlaying(false);
    const fullPosterUrl = liveNewsCanvasRef.current.toDataURL('image/png');
    setEditorTarget('fullNews');
    setEditorImage(fullPosterUrl);
    setEditorTools(NEWS_TOOLS);
    setEditorTitle('Weazel News — Customise Full Broadcast Poster');
    setEditorOpen(true);
  }, []);

  // Save handler for React Image Editor
  const handleEditorSave = useCallback(
    async ({ dataUrl }: ImageEditorSaveResult) => {
      setEditorOpen(false);
      if (editorTarget === 'cctv') {
        setAnnotatedCctvFrame(dataUrl);
        const img = new Image();
        img.onload = () => {
          annotatedImgRef.current = img;
        };
        img.src = dataUrl;
        addToast('Forensic evidence frame saved to Weazel News broadcast!');
      } else {
        const normalised = await normaliseImageToSize(dataUrl, NEWS_W, NEWS_H);
        setNewsHeadlineImage(normalised);
        addToast('Weazel News poster saved');
      }
    },
    [editorTarget, setNewsHeadlineImage, addToast],
  );

  const handleEditorCancel = useCallback(() => {
    setEditorOpen(false);
  }, []);

  const handleClearAnnotation = useCallback(() => {
    setAnnotatedCctvFrame(null);
    annotatedImgRef.current = null;
    setIsLivePlaying(true);
    addToast('Resumed live CCTV surveillance stream');
  }, [addToast]);

  // Export 6-second live CCTV broadcast video clip
  const handleExportCCTVVideo = useCallback(async () => {
    if (!liveNewsCanvasRef.current) return;
    if (!isVideoRecordingSupported()) {
      addToast('Video recording is not supported in this browser.');
      return;
    }

    setIsRecordingVideo(true);
    setRecordProgress(0);
    setIsLivePlaying(true);
    addToast('Recording 6-second Weazel News CCTV broadcast...');

    try {
      const { blob } = await recordCanvasVideo(liveNewsCanvasRef.current, {
        durationMs: 6000,
        fps: 30,
        onProgress: (pct) => setRecordProgress(Math.round(pct * 100)),
      });

      const filename = `${codename.toLowerCase().replace(/\s+/g, '-')}-weazel-news-cctv.webm`;
      downloadVideoBlob(blob, filename);
      addToast('CCTV robbery news broadcast video exported!');
    } catch (err: any) {
      addToast(`Video export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsRecordingVideo(false);
      setRecordProgress(0);
    }
  }, [codename, addToast]);

  // Download still PNG
  const handleDownload = () => {
    if (activeTab === 'news') {
      if (!liveNewsCanvasRef.current) return;
      const dataUrl = liveNewsCanvasRef.current.toDataURL('image/png');
      const filename = `${codename.toLowerCase().replace(/\s+/g, '-')}-weazel-news.png`;
      downloadDataUrl(dataUrl, filename);
    } else {
      if (!finalImage) return;
      const filename = `${codename.toLowerCase().replace(/\s+/g, '-')}-briefing.png`;
      downloadDataUrl(finalImage, filename);
    }
  };

  const handleCopy = async () => {
    let imgToCopy = finalImage;
    if (activeTab === 'news' && liveNewsCanvasRef.current) {
      imgToCopy = liveNewsCanvasRef.current.toDataURL('image/png');
    }
    if (!imgToCopy) return;
    const success = await copyImageToClipboard(imgToCopy);
    addToast(success ? COPY.copied : COPY.copyFailed);
  };

  const handleStartOver = () => {
    if (confirm(COPY.startOverConfirm)) {
      startOver();
    }
  };

  if (!finalImage) return null;

  return (
    <div className="result-screen" ref={containerRef}>
      <div className="result-stamp-container">
        <div className={`result-stamp ${approved ? 'approved' : 'compromised'}`}>
          {approved ? COPY.approved : COPY.compromised}
        </div>
      </div>

      <div className="result-meta">
        <h2 className="result-codename">Operation: {codename}</h2>
        <div className="result-score-row">
          <span className="result-score">{score}</span>
          <span className="result-grade" data-grade={grade}>{grade}</span>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="result-tabs">
        <button
          className={`result-tab ${activeTab === 'briefing' ? 'active' : ''}`}
          onClick={() => {
            playSfx('tab');
            setActiveTab('briefing');
          }}
          type="button"
        >
          Mission Briefing
        </button>
        <button
          className={`result-tab ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => {
            playSfx('tab');
            setActiveTab('news');
          }}
          type="button"
        >
          Weazel News Broadcast (CCTV)
        </button>
      </div>

      <div className="result-image-wrap hud-brackets">
        {activeTab === 'briefing' ? (
          <img
            src={finalImage}
            alt="Final mission briefing"
            className="result-image"
          />
        ) : (
          <canvas
            ref={liveNewsCanvasRef}
            width={NEWS_W}
            height={NEWS_H}
            className="result-news-canvas"
          />
        )}
      </div>

      {/* Interactive CCTV & React Image Editor Control Center */}
      {activeTab === 'news' && (
        <div className="cctv-dashboard">
          {isRecordingVideo && (
            <div className="cctv-recording-banner">
              <span className="cctv-rec-dot blinking" />
              <span className="cctv-rec-label">
                RECORDING WEAZEL NEWS BROADCAST CLIP ({recordProgress}%)...
              </span>
              <div className="cctv-rec-progress-bar">
                <div className="cctv-rec-progress-fill" style={{ width: `${recordProgress}%` }} />
              </div>
            </div>
          )}

          <div className="cctv-toolbar hud-brackets">
            {/* Camera angle selection */}
            <div className="cctv-cam-group">
              <span className="cctv-group-label">SECURITY FEEDS:</span>
              {CCTV_CAMERAS.map((cam, idx) => (
                <button
                  key={cam.id}
                  type="button"
                  className={`btn btn-sm ${cameraIndex === idx ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    playSfx('cctvSwitch');
                    setCameraIndex(idx);
                    if (annotatedCctvFrame) {
                      setAnnotatedCctvFrame(null);
                      annotatedImgRef.current = null;
                      setIsLivePlaying(true);
                    }
                  }}
                >
                  {cam.label}
                </button>
              ))}
            </div>

            {/* Playback toggles */}
            <div className="cctv-playback-group">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setIsLivePlaying((p) => !p)}
              >
                {isLivePlaying ? '⏸ PAUSE TAPE' : '▶ RESUME LIVE'}
              </button>

              {annotatedCctvFrame && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={handleClearAnnotation}
                >
                  ↺ RESUME LIVE CCTV
                </button>
              )}
            </div>

            {/* React Image Editor & Video Export Actions */}
            <div className="cctv-actions-group">
              <button
                type="button"
                className="btn btn-sm btn-primary cctv-enhance-btn"
                onClick={handleFreezeFrameAndEnhance}
              >
                📸 FREEZE FRAME IN EDITOR
              </button>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleExportCCTVVideo}
                disabled={isRecordingVideo}
              >
                🎬 EXPORT CCTV VIDEO CLIP (.WEBM)
              </button>

              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleCustomiseFullNews}
              >
                🎨 FULL POSTER
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="editor-powered-badge">
        CCTV Surveillance & Broadcast Powered by React Image Editor
      </div>

      <div className="result-actions">
        <button className="btn btn-primary btn-large" onClick={handleDownload} type="button">
          {activeTab === 'news' ? 'Download Broadcast (PNG)' : COPY.download}
        </button>
        <button className="btn btn-secondary" onClick={handleCopy} type="button">
          {COPY.copyClipboard}
        </button>
        <button className="btn btn-ghost" onClick={handleStartOver} type="button">
          {COPY.planAnother}
        </button>
      </div>

      {editorOpen && editorImage && (
        <EditorModal
          title={editorTitle}
          image={editorImage}
          tools={editorTools}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}
    </div>
  );
}

