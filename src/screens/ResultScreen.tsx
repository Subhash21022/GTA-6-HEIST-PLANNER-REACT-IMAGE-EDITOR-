import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore } from '../store';
import { COPY } from '../config/copy';
import { downloadDataUrl, copyImageToClipboard, createCanvas, canvasToDataUrl, normaliseImageToSize } from '../utils/canvas';
import { createNewsRightPanel, renderLiveNewsFrame } from '../render/news';
import { renderCCTVFrame, CCTV_CAMERAS } from '../render/cctv';
import { renderReelFrame, REEL_W, REEL_H } from '../render/reel';
import { generateViralPostMetadata, getViralComments, type CitizenComment } from '../config/comments';
import { calculatePayout } from '../config/payout';
import { renderWireTransferReceipt, stampReceiptOnBriefingBoard } from '../render/receipt';
import { HeistPayoutSplitter } from '../ui/HeistPayoutSplitter';
import { recordCanvasVideo, downloadVideoBlob, isVideoRecordingSupported } from '../utils/videoRecorder';
import { EditorModal } from '../editor/EditorModal';
import { NEWS_TOOLS, CCTV_EVIDENCE_TOOLS, REEL_TOOLS, BRIEFING_TOOLS, WANTED_EVIDENCE_TOOLS, type ToolsConfig } from '../editor/toolConfigs';
import type { ImageEditorSaveResult } from '@unlayer/react-image-editor';
import { playSfx } from '../audio/soundManager';
import { pursuitAudio } from '../audio/pursuitAudio';
import { calculateWantedLevel } from '../config/wantedLevel';
import { radioDispatch } from '../audio/radioDispatch';
import { WantedStars } from '../ui/WantedStars';
import { PoliceScanner } from '../ui/PoliceScanner';
import { generateWantedDossier } from '../config/wantedDossier';
import { WantedEvidenceBoard } from '../ui/WantedEvidenceBoard';
import './ResultScreen.css';

const NEWS_W = 1920;
const NEWS_H = 1080;

export function ResultScreen() {
  const finalImage = useStore((s) => s.finalImage);
  const setFinalImage = useStore((s) => s.setFinalImage);
  const codename = useStore((s) => s.codename);
  const target = useStore((s) => s.target);
  const crew = useStore((s) => s.crew);
  const infiltrationResult = useStore((s) => s.infiltrationResult);
  const getawayResult = useStore((s) => s.getawayResult);
  const customCrewPortraits = useStore((s) => s.customCrewPortraits);
  const approach = useStore((s) => s.approach);
  const safeCracked = useStore((s) => s.safeCracked);
  const setNewsHeadlineImage = useStore((s) => s.setNewsHeadlineImage);
  const startOver = useStore((s) => s.startOver);
  const addToast = useStore((s) => s.addToast);
  const containerRef = useRef<HTMLDivElement>(null);

  const grade = infiltrationResult?.grade ?? getawayResult?.grade ?? 'F';
  const approved = (infiltrationResult?.approved ?? false) || (getawayResult?.approved ?? false);
  const score = infiltrationResult?.score ?? getawayResult?.score ?? 0;

  // GTA 5-Star Wanted Level Calculation
  const wantedInfo = useMemo(() => {
    return calculateWantedLevel(approach, infiltrationResult, getawayResult, crew);
  }, [approach, infiltrationResult, getawayResult, crew]);

  const [activeTab, setActiveTab] = useState<'briefing' | 'cut' | 'wanted' | 'news' | 'reel'>('briefing');
  const [cameraIndex, setCameraIndex] = useState(0); // Default to CAM 01 Sky-Weazel Live Pursuit
  const [isLivePlaying, setIsLivePlaying] = useState(true);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [customEditedWantedPoster, setCustomEditedWantedPoster] = useState<string | null>(null);

  // The Cut: Heist Payout & Crew Splitter State
  const [customCrewCuts, setCustomCrewCuts] = useState<Record<string, number>>({});
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null);
  const [isStampingReceipt, setIsStampingReceipt] = useState(false);

  const payoutBreakdown = useMemo(() => {
    return calculatePayout(target, grade, crew, customCrewCuts, safeCracked);
  }, [target, grade, crew, customCrewCuts, safeCracked]);

  // VCPD & FBI Most Wanted Dossier Profile
  const wantedDossier = useMemo(() => {
    return generateWantedDossier({
      codename,
      target,
      approach,
      crew,
      customCrewPortraits,
      score,
      grade,
      wantedInfo,
      payoutBreakdown,
    });
  }, [codename, target, approach, crew, customCrewPortraits, score, grade, wantedInfo, payoutBreakdown]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await renderWireTransferReceipt(payoutBreakdown, codename);
        if (!cancelled) setReceiptDataUrl(url);
      } catch (err) {
        console.error('Failed to generate receipt:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [payoutBreakdown, codename]);

  // ViceGram Viral Social Reel State
  const viralMetadata = useMemo(() => {
    return generateViralPostMetadata(target?.name || 'TARGET FACILITY', approach, crew, score);
  }, [target?.name, approach, crew, score]);

  const [citizenComments, setCitizenComments] = useState<CitizenComment[]>([]);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [newCommentInput, setNewCommentInput] = useState<string>('');
  const [annotatedReelFrame, setAnnotatedReelFrame] = useState<string | null>(null);

  const liveReelCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotatedReelImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setCitizenComments(getViralComments(approach, crew, target?.name || 'TARGET FACILITY'));
    setLikesCount(viralMetadata.initialLikes);
    setIsLiked(false);
  }, [approach, crew, target?.name, viralMetadata]);

  // React Image Editor integration state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTarget, setEditorTarget] = useState<'cctv' | 'fullNews' | 'reel' | 'briefing' | 'wanted'>('cctv');
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

      const imgWrap = ctx.querySelector('.result-image-wrap');
      if (imgWrap) {
        tl.fromTo(imgWrap,
          { opacity: 0, scale: 0.97, filter: 'blur(4px)' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.8 },
          '-=0.3',
        );
      }

      const actionsEl = ctx.querySelector('.result-actions');
      if (actionsEl) {
        tl.fromTo(actionsEl,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5 },
          '-=0.3',
        );
      }

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
    if ((activeTab === 'news' || activeTab === 'reel') && cameraIndex === 0 && isLivePlaying) {
      pursuitAudio.start();
    } else {
      pursuitAudio.stop();
    }
    return () => {
      pursuitAudio.stop();
    };
  }, [activeTab, cameraIndex, isLivePlaying]);

  // Procedural VCPD Police Radio Dispatch Scanner
  useEffect(() => {
    if (activeTab === 'news' && isLivePlaying) {
      radioDispatch.start(target?.name || 'TARGET FACILITY', approach, wantedInfo.stars);
    } else {
      radioDispatch.stop();
    }
    return () => {
      radioDispatch.stop();
    };
  }, [activeTab, isLivePlaying, target?.name, approach, wantedInfo.stars]);

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

  // Live Animation Loop (Weazel News & ViceGram Reel) (30-60 FPS)
  useEffect(() => {
    if (activeTab !== 'news' && activeTab !== 'reel') {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    lastTickRef.current = performance.now();

    const loop = (now: number) => {
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (isLivePlaying && delta > 0 && delta < 200) {
        timeMsRef.current += delta;
      }

      // Synchronize live pursuit tire screech & backfires with audio engine
      if ((activeTab === 'news' || activeTab === 'reel') && cameraIndex === 0 && isLivePlaying) {
        const cycleT = (timeMsRef.current / 1000) % 10.0;
        const isDrifting = cycleT >= 3.3 && cycleT < 6.0;
        const isBraking = cycleT >= 3.0 && cycleT < 3.3;
        const hasFlames = isDrifting || (Math.sin((timeMsRef.current / 1000) * 8) > 0.4);
        pursuitAudio.updateFrame(isDrifting, isBraking, hasFlames);
      }

      if (activeTab === 'news') {
        const canvas = liveNewsCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
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
              wantedInfo,
              dispatchMsg: radioDispatch.getCurrentMessage(),
            });
          }
        }
      } else if (activeTab === 'reel') {
        const canvas = liveReelCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            renderReelFrame(ctx, REEL_W, REEL_H, {
              timeMs: timeMsRef.current,
              cameraIndex,
              approach,
              crew,
              targetName: target?.name || 'TARGET FACILITY',
              codename,
              score,
              grade,
              metadata: viralMetadata,
              comments: citizenComments,
              likesCount,
              isLiked,
              annotatedReelImg: annotatedReelImgRef.current,
            });
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [
    activeTab,
    isLivePlaying,
    cameraIndex,
    approach,
    target,
    codename,
    score,
    grade,
    approved,
    crew,
    wantedInfo,
    viralMetadata,
    citizenComments,
    likesCount,
    isLiked,
  ]);

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
      wantedInfo,
      dispatchMsg: radioDispatch.getCurrentMessage(),
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
      } else if (editorTarget === 'reel') {
        setAnnotatedReelFrame(dataUrl);
        const img = new Image();
        img.onload = () => {
          annotatedReelImgRef.current = img;
        };
        img.src = dataUrl;
        addToast('Viral social reel customized with stickers & captions!');
      } else if (editorTarget === 'wanted') {
        setCustomEditedWantedPoster(dataUrl);
        addToast('VCPD Classified Evidence Dossier updated and stamped!');
      } else if (editorTarget === 'briefing') {
        setFinalImage(dataUrl);
        addToast('Mission briefing with stamped wire transfer receipt saved!');
      } else {
        const normalised = await normaliseImageToSize(dataUrl, NEWS_W, NEWS_H);
        setNewsHeadlineImage(normalised);
        addToast('Weazel News poster saved');
      }
    },
    [editorTarget, setFinalImage, setNewsHeadlineImage, addToast],
  );

  const handleOpenWantedEditor = useCallback((imageDataUrl: string, posterStyle: string) => {
    setIsLivePlaying(false);
    playSfx('cameraShutter');
    setEditorTarget('wanted');
    setEditorImage(imageDataUrl);
    setEditorTools(WANTED_EVIDENCE_TOOLS);
    setEditorTitle(`VCPD Most Wanted Dossier — ${posterStyle === 'evidence' ? 'FBI Case File Corkboard' : 'Retro Wanted Poster'}`);
    setEditorOpen(true);
  }, []);

  const handleEditorCancel = useCallback(() => {
    setEditorOpen(false);
  }, []);

  const handleClearAnnotation = useCallback(() => {
    setAnnotatedCctvFrame(null);
    annotatedImgRef.current = null;
    setIsLivePlaying(true);
    addToast('Resumed live CCTV surveillance stream');
  }, [addToast]);

  // Handle "Edit Viral Reel in React Image Editor"
  const handleEditViralReel = useCallback(() => {
    if (!liveReelCanvasRef.current) return;
    setIsLivePlaying(false);
    playSfx('cameraShutter');
    const reelDataUrl = liveReelCanvasRef.current.toDataURL('image/png');
    setEditorTarget('reel');
    setEditorImage(reelDataUrl);
    setEditorTools(REEL_TOOLS);
    setEditorTitle('ViceGram Reel — Add Captions, Emojis & Stickers');
    setEditorOpen(true);
  }, []);

  const handleClearReelAnnotation = useCallback(() => {
    setAnnotatedReelFrame(null);
    annotatedReelImgRef.current = null;
    setIsLivePlaying(true);
    addToast('Resumed live ViceGram reel stream');
  }, [addToast]);

  const handleLikeReel = () => {
    playSfx('reelLike');
    setIsLiked((prev) => !prev);
  };

  const handleAddComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCommentInput.trim()) return;
    playSfx('reelCommentPop');
    const newComment: CitizenComment = {
      id: `user-${Date.now()}`,
      handle: '@you',
      name: 'You (Mastermind)',
      avatarColor: '#ff2d78',
      avatarInitial: 'Y',
      verified: true,
      text: newCommentInput.trim(),
      timeAgo: 'Just now',
      likes: '1',
    };
    setCitizenComments((prev) => [newComment, ...prev]);
    setNewCommentInput('');
    addToast('Comment bleeted to ViceGram live feed!');
  };

  const handleExportReelVideo = useCallback(async () => {
    if (!liveReelCanvasRef.current) return;
    if (!isVideoRecordingSupported()) {
      addToast('Video recording is not supported in this browser.');
      return;
    }

    setIsRecordingVideo(true);
    setRecordProgress(0);
    setIsLivePlaying(true);
    addToast('Recording 6-second ViceGram 9:16 viral reel clip...');

    try {
      const { blob } = await recordCanvasVideo(liveReelCanvasRef.current, {
        durationMs: 6000,
        fps: 30,
        onProgress: (pct) => setRecordProgress(Math.round(pct * 100)),
      });

      const filename = `${codename.toLowerCase().replace(/\s+/g, '-')}-vicegram-reel.webm`;
      downloadVideoBlob(blob, filename);
      addToast('ViceGram viral reel video exported!');
    } catch (err: any) {
      addToast(`Video export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsRecordingVideo(false);
      setRecordProgress(0);
    }
  }, [codename, addToast]);

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

  // The Cut: Crew payout adjustments & receipt stamping
  const handleCutChange = useCallback((modifierId: string, percent: number) => {
    setCustomCrewCuts((prev) => ({
      ...prev,
      [modifierId]: percent,
    }));
  }, []);

  const handleResetCuts = useCallback(() => {
    setCustomCrewCuts({});
    playSfx('cashTally', 0.8);
    addToast('Crew payout percentages reset to defaults');
  }, [addToast]);

  const handleStampReceipt = useCallback(async () => {
    if (!finalImage) return;
    setIsStampingReceipt(true);
    playSfx('cameraShutter');
    addToast('Stamping wire transfer slip onto mission briefing board...');

    try {
      const stampedBoardUrl = await stampReceiptOnBriefingBoard(finalImage, payoutBreakdown, codename);
      setEditorTarget('briefing');
      setEditorImage(stampedBoardUrl);
      setEditorTools(BRIEFING_TOOLS);
      setEditorTitle('Mission Briefing — Wire Transfer Slip Stamped (Annotate & Customize)');
      setEditorOpen(true);
    } catch (err: any) {
      console.error('Failed to stamp receipt:', err);
      addToast(`Failed to stamp receipt: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsStampingReceipt(false);
    }
  }, [finalImage, payoutBreakdown, codename, addToast]);

  const handleDownloadReceipt = useCallback(() => {
    if (!receiptDataUrl) return;
    const filename = `${codename.toLowerCase().replace(/\s+/g, '-')}-wire-transfer-receipt.png`;
    downloadDataUrl(receiptDataUrl, filename);
    addToast('Bank of Leonida wire transfer receipt downloaded!');
  }, [receiptDataUrl, codename, addToast]);

  // Download still PNG
  const handleDownload = () => {
    if (activeTab === 'cut') {
      if (!receiptDataUrl) return;
      const filename = `${codename.toLowerCase().replace(/\s+/g, '-')}-wire-transfer-receipt.png`;
      downloadDataUrl(receiptDataUrl, filename);
    } else if (activeTab === 'wanted') {
      if (customEditedWantedPoster) {
        const filename = `${codename.toLowerCase().replace(/\s+/g, '-')}-vcpd-evidence-dossier.png`;
        downloadDataUrl(customEditedWantedPoster, filename);
      } else {
        addToast('Use the "Download Poster" button on the evidence board.');
      }
    } else if (activeTab === 'news') {
      if (!liveNewsCanvasRef.current) return;
      const dataUrl = liveNewsCanvasRef.current.toDataURL('image/png');
      const filename = `${codename.toLowerCase().replace(/\s+/g, '-')}-weazel-news.png`;
      downloadDataUrl(dataUrl, filename);
    } else if (activeTab === 'reel') {
      if (!liveReelCanvasRef.current) return;
      const dataUrl = liveReelCanvasRef.current.toDataURL('image/png');
      const filename = `${codename.toLowerCase().replace(/\s+/g, '-')}-vicegram-reel.png`;
      downloadDataUrl(dataUrl, filename);
    } else {
      if (!finalImage) return;
      const filename = `${codename.toLowerCase().replace(/\s+/g, '-')}-briefing.png`;
      downloadDataUrl(finalImage, filename);
    }
  };

  const handleCopy = async () => {
    let imgToCopy = finalImage;
    if (activeTab === 'cut' && receiptDataUrl) {
      imgToCopy = receiptDataUrl;
    } else if (activeTab === 'wanted' && customEditedWantedPoster) {
      imgToCopy = customEditedWantedPoster;
    } else if (activeTab === 'news' && liveNewsCanvasRef.current) {
      imgToCopy = liveNewsCanvasRef.current.toDataURL('image/png');
    } else if (activeTab === 'reel' && liveReelCanvasRef.current) {
      imgToCopy = liveReelCanvasRef.current.toDataURL('image/png');
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
        <WantedStars wantedInfo={wantedInfo} size="md" />
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
          className={`result-tab ${activeTab === 'cut' ? 'active' : ''}`}
          onClick={() => {
            playSfx('cashTally', 0.9);
            setActiveTab('cut');
          }}
          type="button"
        >
          💰 The Cut (Payout)
        </button>
        <button
          className={`result-tab ${activeTab === 'wanted' ? 'active' : ''}`}
          onClick={() => {
            playSfx('wantedStar', 0.9);
            setActiveTab('wanted');
          }}
          type="button"
        >
          🚨 VCPD Most Wanted
        </button>
        <button
          className={`result-tab ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => {
            playSfx('tab');
            setActiveTab('news');
          }}
          type="button"
        >
          Weazel News (CCTV)
        </button>
        <button
          className={`result-tab ${activeTab === 'reel' ? 'active' : ''}`}
          onClick={() => {
            playSfx('tab');
            setActiveTab('reel');
          }}
          type="button"
        >
          📱 ViceGram Viral Reel
        </button>
      </div>

      {activeTab === 'cut' ? (
        <HeistPayoutSplitter
          breakdown={payoutBreakdown}
          onCutChange={handleCutChange}
          onResetCuts={handleResetCuts}
          onStampOnBoard={handleStampReceipt}
          onDownloadReceipt={handleDownloadReceipt}
          receiptDataUrl={receiptDataUrl}
          isStamping={isStampingReceipt}
        />
      ) : activeTab === 'wanted' ? (
        <WantedEvidenceBoard
          dossier={wantedDossier}
          onOpenEditor={handleOpenWantedEditor}
          customEditedPoster={customEditedWantedPoster}
          onToast={addToast}
        />
      ) : (
        <div className={`result-image-wrap hud-brackets ${activeTab === 'reel' ? 'reel-wrap-mode' : ''}`}>
          {activeTab === 'briefing' ? (
            <img
              src={finalImage}
              alt="Final mission briefing"
              className="result-image"
            />
          ) : activeTab === 'news' ? (
            <canvas
              ref={liveNewsCanvasRef}
              width={NEWS_W}
              height={NEWS_H}
              className="result-news-canvas"
            />
          ) : (
            <div className="reel-phone-mockup">
              <canvas
                ref={liveReelCanvasRef}
                width={REEL_W}
                height={REEL_H}
                className="result-reel-canvas"
              />
            </div>
          )}
        </div>
      )}

      {/* Interactive CCTV & React Image Editor Control Center */}
      {activeTab === 'news' && (
        <div className="cctv-dashboard">
          {/* Tactical VCPD Police Scanner Widget */}
          <PoliceScanner className="cctv-scanner-widget" />

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

      {/* ViceGram Viral Reel Interactive Control Center */}
      {activeTab === 'reel' && (
        <div className="reel-dashboard">
          {isRecordingVideo && (
            <div className="cctv-recording-banner">
              <span className="cctv-rec-dot blinking" />
              <span className="cctv-rec-label">
                RECORDING 9:16 VERTICAL VIRAL REEL CLIP ({recordProgress}%)...
              </span>
              <div className="cctv-rec-progress-bar">
                <div className="cctv-rec-progress-fill" style={{ width: `${recordProgress}%` }} />
              </div>
            </div>
          )}

          {/* Viral Reel Live Stats Strip */}
          <div className="reel-stats-strip hud-brackets">
            <div className="reel-stat-item">
              <span className="reel-stat-label">🔴 STREAM:</span>
              <span className="reel-stat-val text-cyan">{viralMetadata.liveViewers} WATCHING</span>
            </div>
            <div className="reel-stat-item">
              <span className="reel-stat-label">❤️ LIKES:</span>
              <span className="reel-stat-val text-pink">
                {isLiked ? `${((likesCount + 1) / 1000).toFixed(1)}K` : `${(likesCount / 1000).toFixed(1)}K`}
              </span>
            </div>
            <div className="reel-stat-item">
              <span className="reel-stat-label">🔁 BLEETS:</span>
              <span className="reel-stat-val text-sand">{viralMetadata.sharesCount}</span>
            </div>
            <div className="reel-stat-item">
              <span className="reel-stat-label">🎵 AUDIO:</span>
              <span className="reel-stat-val text-yellow">140 BPM PURSUIT</span>
            </div>
          </div>

          {/* Reel Toolbar */}
          <div className="cctv-toolbar hud-brackets">
            {/* Camera angle selection */}
            <div className="cctv-cam-group">
              <span className="cctv-group-label">REEL CAM:</span>
              {CCTV_CAMERAS.map((cam, idx) => (
                <button
                  key={cam.id}
                  type="button"
                  className={`btn btn-sm ${cameraIndex === idx ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    playSfx('cctvSwitch');
                    setCameraIndex(idx);
                    if (annotatedReelFrame) {
                      setAnnotatedReelFrame(null);
                      annotatedReelImgRef.current = null;
                      setIsLivePlaying(true);
                    }
                  }}
                >
                  {cam.label}
                </button>
              ))}
            </div>

            {/* Playback toggles & Like button */}
            <div className="cctv-playback-group">
              <button
                type="button"
                className={`btn btn-sm ${isLiked ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleLikeReel}
              >
                {isLiked ? '❤️ LIKED' : '🤍 LIKE REEL'}
              </button>

              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setIsLivePlaying((p) => !p)}
              >
                {isLivePlaying ? '⏸ PAUSE' : '▶ LIVE'}
              </button>

              {annotatedReelFrame && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={handleClearReelAnnotation}
                >
                  ↺ RESUME STREAM
                </button>
              )}
            </div>

            {/* React Image Editor & Video Export Actions */}
            <div className="cctv-actions-group">
              <button
                type="button"
                className="btn btn-sm btn-primary reel-enhance-btn"
                onClick={handleEditViralReel}
              >
                📸 EDIT VIRAL REEL IN REACT IMAGE EDITOR
              </button>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleExportReelVideo}
                disabled={isRecordingVideo}
              >
                🎬 EXPORT 9:16 REEL CLIP (.WEBM)
              </button>
            </div>
          </div>

          {/* Citizen Comment Interactive Bleet Form */}
          <form className="reel-comment-form hud-brackets" onSubmit={handleAddComment}>
            <span className="comment-form-avatar">Y</span>
            <input
              type="text"
              className="reel-comment-input"
              placeholder="Bleet a simulated Vice City citizen comment as @you..."
              value={newCommentInput}
              onChange={(e) => setNewCommentInput(e.target.value)}
              maxLength={120}
            />
            <button type="submit" className="btn btn-sm btn-secondary" disabled={!newCommentInput.trim()}>
              💬 BLEET
            </button>
          </form>
        </div>
      )}

      <div className="editor-powered-badge">
        Wanted Mugshots, CCTV Feeds, Viral Reels & Wire Transfer Receipts Powered by React Image Editor
      </div>

      <div className="result-actions">
        <button className="btn btn-primary btn-large" onClick={handleDownload} type="button">
          {activeTab === 'cut'
            ? 'Download Wire Transfer Slip (PNG)'
            : activeTab === 'wanted'
            ? 'Download Wanted Dossier (PNG)'
            : activeTab === 'news'
            ? 'Download Broadcast (PNG)'
            : activeTab === 'reel'
            ? 'Download ViceGram Reel (PNG)'
            : COPY.download}
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

