import { useRef, useState, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore } from '../store';
import { TARGETS, type Target } from '../config/targets';
import { COPY } from '../config/copy';
import { EditorModal } from '../editor/EditorModal';
import { RECON_TOOLS } from '../editor/toolConfigs';
import type { ImageEditorSaveResult } from '@unlayer/react-image-editor';
import { playSfx } from '../audio/soundManager';
import './TargetScreen.css';

function StarRating({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <span className="star-rating" aria-label={`Difficulty: ${count} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < count ? 'star filled' : 'star'}>
          &#9733;
        </span>
      ))}
    </span>
  );
}

export function TargetScreen() {
  const setTarget = useStore((s) => s.setTarget);
  const setScreen = useStore((s) => s.setScreen);
  const goBack = useStore((s) => s.goBack);
  const reconImages = useStore((s) => s.reconImages);
  const setReconImage = useStore((s) => s.setReconImage);
  const addToast = useStore((s) => s.addToast);
  const containerRef = useRef<HTMLDivElement>(null);

  const [reconTarget, setReconTarget] = useState<Target | null>(null);

  useGSAP(() => {
    const ctx = containerRef.current;
    if (!ctx) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(ctx.querySelector('.screen-header'),
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' },
      );

      gsap.fromTo(ctx.querySelectorAll('.target-card'),
        { y: 60, opacity: 0, filter: 'blur(8px)' },
        {
          y: 0, opacity: 1, filter: 'blur(0px)',
          duration: 0.7, stagger: 0.12, ease: 'power3.out', delay: 0.2,
        },
      );
    });
  }, { scope: containerRef });

  const handlePick = (idx: number) => {
    playSfx('targetSelect');
    setTarget(TARGETS[idx]);
    setScreen('approach');
  };

  const handleReconSave = useCallback(
    (result: ImageEditorSaveResult) => {
      if (reconTarget) {
        setReconImage(reconTarget.id, result.dataUrl);
        addToast(`Recon intel saved for ${reconTarget.name}`);
      }
      setReconTarget(null);
    },
    [reconTarget, setReconImage, addToast],
  );

  const handleReconCancel = useCallback(() => {
    setReconTarget(null);
  }, []);

  return (
    <div className="target-screen" ref={containerRef}>
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
        <h2 className="screen-title">SELECT TARGET</h2>
        <div />
      </header>

      <div className="target-cards">
        {TARGETS.map((t, i) => (
          <div key={t.id} className="target-card-container">
            <button
              className="target-card glass-panel hud-brackets"
              onClick={() => handlePick(i)}
              type="button"
            >
              <div className="target-thumb-wrap">
                <img
                  src={reconImages[t.id] ?? t.heroImage}
                  alt={t.name}
                  className="target-thumb"
                />
                {reconImages[t.id] && (
                  <span className="recon-badge">INTEL MARKED</span>
                )}
              </div>
              <div className="target-info">
                <h3 className="target-name">{t.name}</h3>
                <StarRating count={t.difficulty} />
                <p className="target-dossier">{t.dossierText}</p>
                <div className="target-facts">
                  <span>Cameras: {t.cameraCount}</span>
                  <span>Guards: {t.guardCount}</span>
                  <span>Vault: {t.vaultType}</span>
                </div>
              </div>
            </button>
            <button
              className="btn btn-ghost target-recon-btn"
              onClick={(e) => {
                e.stopPropagation();
                playSfx('cameraShutter');
                setReconTarget(t);
              }}
              type="button"
            >
              Mark Blindspots
            </button>
          </div>
        ))}
      </div>

      <div className="editor-powered-badge">
        Powered by React Image Editor
      </div>

      {reconTarget && (
        <EditorModal
          title={`${reconTarget.name} — Reconnaissance Intel`}
          image={reconImages[reconTarget.id] ?? reconTarget.heroImage}
          tools={RECON_TOOLS}
          onSave={handleReconSave}
          onCancel={handleReconCancel}
        />
      )}
    </div>
  );
}
