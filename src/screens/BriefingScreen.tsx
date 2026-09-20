import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore } from '../store';
import { COPY } from '../config/copy';
import { composeBriefingBoard } from '../render/briefing';
import { EditorModal } from '../editor/EditorModal';
import { BRIEFING_TOOLS } from '../editor/toolConfigs';
import { normaliseImageToSize } from '../utils/canvas';
import './BriefingScreen.css';

const BOARD_W = 1920;
const BOARD_H = 1080;

export function BriefingScreen() {
  const target = useStore((s) => s.target);
  const crew = useStore((s) => s.crew);
  const codename = useStore((s) => s.codename);
  const infiltrationImage = useStore((s) => s.infiltrationImage);
  const infiltrationResult = useStore((s) => s.infiltrationResult);
  const getawayImage = useStore((s) => s.getawayImage);
  const getawayResult = useStore((s) => s.getawayResult);
  const setBriefingImage = useStore((s) => s.setBriefingImage);
  const setFinalImage = useStore((s) => s.setFinalImage);
  const setScreen = useStore((s) => s.setScreen);
  const goBack = useStore((s) => s.goBack);
  const addToast = useStore((s) => s.addToast);
  const customCrewPortraits = useStore((s) => s.customCrewPortraits);
  const reconImages = useStore((s) => s.reconImages);
  const containerRef = useRef<HTMLDivElement>(null);

  const [boardImage, setBoardImage] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [composing, setComposing] = useState(true);

  const grade = infiltrationResult?.grade ?? getawayResult?.grade ?? 'F';
  const approved = (infiltrationResult?.approved ?? false) || (getawayResult?.approved ?? false);
  const take = infiltrationResult?.take ?? getawayResult?.take ?? '$0';

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

  useEffect(() => {
    if (!target) return;
    let cancelled = false;

    (async () => {
      setComposing(true);
      const reconImg = target ? (reconImages[target.id] ?? null) : null;
      const board = await composeBriefingBoard(
        target.name,
        codename,
        infiltrationImage,
        getawayImage,
        crew,
        grade,
        approved,
        take,
        customCrewPortraits,
        reconImg,
      );
      if (!cancelled) {
        setBoardImage(board);
        setBriefingImage(board);
        setComposing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [target, codename, infiltrationImage, getawayImage, crew, grade, approved, take, setBriefingImage, customCrewPortraits, reconImages]);

  useEffect(() => {
    if (!composing && boardImage && containerRef.current) {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(containerRef.current!.querySelector('.briefing-preview'),
          { opacity: 0, scale: 0.96, filter: 'blur(6px)' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out' },
        );
        gsap.fromTo(containerRef.current!.querySelector('.briefing-actions'),
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.3 },
        );
      });
    }
  }, [composing, boardImage]);

  const handleOpenEditor = () => {
    if (boardImage) setEditorOpen(true);
  };

  const handleEditorSave = useCallback(
    async ({ dataUrl }: { dataUrl: string; blob: Blob }) => {
      setEditorOpen(false);
      const normalised = await normaliseImageToSize(dataUrl, BOARD_W, BOARD_H);
      setFinalImage(normalised);
      addToast(COPY.saved);
      setScreen('result');
    },
    [setFinalImage, addToast, setScreen],
  );

  const handleEditorCancel = useCallback(() => {
    setEditorOpen(false);
  }, []);

  const handleSkipEditor = () => {
    if (boardImage) {
      setFinalImage(boardImage);
      setScreen('result');
    }
  };

  if (!target) return null;

  return (
    <div className="briefing-screen" ref={containerRef}>
      <header className="screen-header">
        <button className="btn btn-ghost" onClick={goBack} type="button">
          {COPY.back}
        </button>
        <h2 className="screen-title">MISSION BRIEFING</h2>
        <div />
      </header>

      <div className="briefing-content">
        {composing ? (
          <div className="briefing-loading">
            <div className="editor-modal-spinner" />
            <p>Composing briefing board...</p>
          </div>
        ) : (
          <>
            <div className="briefing-preview hud-brackets">
              <img src={boardImage!} alt="Mission briefing board" className="briefing-img" />
            </div>
            <div className="briefing-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={handleOpenEditor}
                type="button"
              >
                Add final touches in editor
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleSkipEditor}
                type="button"
              >
                Use as-is
              </button>
            </div>
          </>
        )}
      </div>

      <div className="editor-powered-badge">
        Briefing composed with React Image Editor
      </div>

      {editorOpen && boardImage && (
        <EditorModal
          title="Final Briefing Touches"
          image={boardImage}
          tools={BRIEFING_TOOLS}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}
    </div>
  );
}
