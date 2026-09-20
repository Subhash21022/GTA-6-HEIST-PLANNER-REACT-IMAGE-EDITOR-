import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore } from '../store';
import { COPY } from '../config/copy';
import { downloadDataUrl, copyImageToClipboard, normaliseImageToSize } from '../utils/canvas';
import { composeWeazelNews } from '../render/news';
import { EditorModal } from '../editor/EditorModal';
import { NEWS_TOOLS } from '../editor/toolConfigs';
import type { ImageEditorSaveResult } from '@unlayer/react-image-editor';
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
  const reconImages = useStore((s) => s.reconImages);
  const newsHeadlineImage = useStore((s) => s.newsHeadlineImage);
  const setNewsHeadlineImage = useStore((s) => s.setNewsHeadlineImage);
  const startOver = useStore((s) => s.startOver);
  const addToast = useStore((s) => s.addToast);
  const containerRef = useRef<HTMLDivElement>(null);

  const grade = infiltrationResult?.grade ?? getawayResult?.grade ?? 'F';
  const approved = (infiltrationResult?.approved ?? false) || (getawayResult?.approved ?? false);
  const score = infiltrationResult?.score ?? getawayResult?.score ?? 0;

  const [activeTab, setActiveTab] = useState<'briefing' | 'news'>('briefing');
  const [newsImage, setNewsImage] = useState<string | null>(null);
  const [newsComposing, setNewsComposing] = useState(false);
  const [newsEditorOpen, setNewsEditorOpen] = useState(false);

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

  const composeNews = useCallback(async () => {
    if (!target) return;
    setNewsComposing(true);
    try {
      const reconImg = reconImages[target.id] ?? null;
      const composed = await composeWeazelNews(
        target.name,
        codename,
        score,
        grade,
        approved,
        crew,
        customCrewPortraits,
        reconImg,
      );
      setNewsImage(composed);
      setNewsHeadlineImage(composed);
    } finally {
      setNewsComposing(false);
    }
  }, [target, codename, score, grade, approved, crew, customCrewPortraits, reconImages, setNewsHeadlineImage]);

  // Compose news once when tab is first opened
  useEffect(() => {
    if (activeTab === 'news' && !newsImage && !newsComposing) {
      composeNews();
    }
  }, [activeTab, newsImage, newsComposing, composeNews]);

  // Restore persisted news image
  useEffect(() => {
    if (newsHeadlineImage && !newsImage) {
      setNewsImage(newsHeadlineImage);
    }
  }, [newsHeadlineImage, newsImage]);

  const currentImage = activeTab === 'briefing' ? finalImage : newsImage;

  const handleDownload = () => {
    if (!currentImage) return;
    const suffix = activeTab === 'news' ? 'weazel-news' : 'briefing';
    const filename = `${codename.toLowerCase().replace(/\s+/g, '-')}-${suffix}.png`;
    downloadDataUrl(currentImage, filename);
  };

  const handleCopy = async () => {
    if (!currentImage) return;
    const success = await copyImageToClipboard(currentImage);
    addToast(success ? COPY.copied : COPY.copyFailed);
  };

  const handleStartOver = () => {
    if (confirm(COPY.startOverConfirm)) {
      startOver();
    }
  };

  const handleOpenNewsEditor = () => {
    if (newsImage) setNewsEditorOpen(true);
  };

  const handleNewsEditorSave = useCallback(
    async ({ dataUrl }: ImageEditorSaveResult) => {
      setNewsEditorOpen(false);
      const normalised = await normaliseImageToSize(dataUrl, NEWS_W, NEWS_H);
      setNewsImage(normalised);
      setNewsHeadlineImage(normalised);
      addToast('Weazel News poster saved');
    },
    [setNewsHeadlineImage, addToast],
  );

  const handleNewsEditorCancel = useCallback(() => {
    setNewsEditorOpen(false);
  }, []);

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
          onClick={() => setActiveTab('briefing')}
          type="button"
        >
          Mission Briefing
        </button>
        <button
          className={`result-tab ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
          type="button"
        >
          Weazel News Broadcast
        </button>
      </div>

      <div className="result-image-wrap hud-brackets">
        {activeTab === 'news' && (newsComposing || !newsImage) ? (
          <div className="result-news-loading">
            <div className="editor-modal-spinner" />
            <p>Composing Weazel News broadcast...</p>
          </div>
        ) : (
          <img
            src={currentImage!}
            alt={activeTab === 'briefing' ? 'Final mission briefing' : 'Weazel News broadcast'}
            className="result-image"
          />
        )}
      </div>

      {activeTab === 'news' && newsImage && (
        <div className="result-news-editor-row">
          <button
            className="btn btn-secondary"
            onClick={handleOpenNewsEditor}
            type="button"
          >
            Customise in Editor
          </button>
          <button
            className="btn btn-ghost"
            onClick={composeNews}
            type="button"
          >
            Regenerate
          </button>
        </div>
      )}

      <div className="editor-powered-badge">
        Created with React Image Editor
      </div>

      <div className="result-actions">
        <button className="btn btn-primary btn-large" onClick={handleDownload} type="button">
          {COPY.download}
        </button>
        <button className="btn btn-secondary" onClick={handleCopy} type="button">
          {COPY.copyClipboard}
        </button>
        <button className="btn btn-ghost" onClick={handleStartOver} type="button">
          {COPY.planAnother}
        </button>
      </div>

      {newsEditorOpen && newsImage && (
        <EditorModal
          title="Weazel News — Customise Broadcast"
          image={newsImage}
          tools={NEWS_TOOLS}
          onSave={handleNewsEditorSave}
          onCancel={handleNewsEditorCancel}
        />
      )}
    </div>
  );
}
