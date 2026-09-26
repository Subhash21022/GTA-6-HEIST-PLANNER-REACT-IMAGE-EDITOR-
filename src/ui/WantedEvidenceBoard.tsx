import { useState, useEffect } from 'react';
import type { WantedDossierData } from '../config/wantedDossier';
import { renderWantedPoster, type WantedPosterStyle } from '../render/wantedPoster';
import { downloadDataUrl, copyImageToClipboard } from '../utils/canvas';
import { playSfx } from '../audio/soundManager';
import './WantedEvidenceBoard.css';

interface WantedEvidenceBoardProps {
  dossier: WantedDossierData;
  onOpenEditor: (imageDataUrl: string, style: WantedPosterStyle) => void;
  customEditedPoster?: string | null;
  onToast: (msg: string) => void;
}

export function WantedEvidenceBoard({
  dossier,
  onOpenEditor,
  customEditedPoster,
  onToast,
}: WantedEvidenceBoardProps) {
  const [style, setStyle] = useState<WantedPosterStyle>('evidence');
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSuspectTab, setActiveSuspectTab] = useState<number>(0);

  // Render poster whenever style or dossier changes
  useEffect(() => {
    let cancelled = false;
    setIsGenerating(true);

    renderWantedPoster(dossier, style)
      .then((url) => {
        if (!cancelled) {
          setPosterDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to render wanted poster:', err);
        if (!cancelled) setIsGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dossier, style]);

  const activeDisplayUrl = customEditedPoster || posterDataUrl;

  const handleStyleChange = (newStyle: WantedPosterStyle) => {
    if (newStyle === style) return;
    playSfx('pin');
    setStyle(newStyle);
  };

  const handleDownload = () => {
    if (!activeDisplayUrl) return;
    playSfx('select');
    const filename = `VCPD_WANTED_${dossier.codename.toUpperCase()}_${style.toUpperCase()}.png`;
    downloadDataUrl(activeDisplayUrl, filename);
    onToast(`Downloaded ${filename}`);
  };

  const handleCopy = async () => {
    if (!activeDisplayUrl) return;
    playSfx('select');
    const ok = await copyImageToClipboard(activeDisplayUrl);
    if (ok) {
      onToast('Dossier copied to clipboard!');
    } else {
      onToast('Failed to copy to clipboard');
    }
  };

  const handleOpenEditor = () => {
    if (!activeDisplayUrl) return;
    playSfx('cameraShutter');
    onOpenEditor(activeDisplayUrl, style);
  };

  return (
    <div className="wanted-evidence-container">
      {/* Top Evidence Controls Header */}
      <div className="wanted-controls-bar hud-brackets">
        <div className="wanted-style-toggle">
          <span className="wanted-label">CLASSIFIED FORMAT:</span>
          <button
            className={`btn btn-secondary ${style === 'evidence' ? 'active' : ''}`}
            onClick={() => handleStyleChange('evidence')}
            type="button"
          >
            📋 FBI Evidence Corkboard
          </button>
          <button
            className={`btn btn-secondary ${style === 'poster' ? 'active' : ''}`}
            onClick={() => handleStyleChange('poster')}
            type="button"
          >
            📜 Retro VCPD Wanted Poster
          </button>
        </div>

        <div className="wanted-action-group">
          <button
            className="btn btn-primary wanted-editor-btn"
            onClick={handleOpenEditor}
            disabled={!activeDisplayUrl || isGenerating}
            type="button"
            title="Add forensic stamps, fingerprint decals, and red evidence lines in React Image Editor"
          >
            🎨 CUSTOMIZE IN REACT IMAGE EDITOR
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleDownload}
            disabled={!activeDisplayUrl}
            type="button"
          >
            💾 Download Poster
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleCopy}
            disabled={!activeDisplayUrl}
            type="button"
          >
            📋 Copy
          </button>
        </div>
      </div>

      {/* Main Board Display */}
      <div className="wanted-board-stage hud-brackets">
        {isGenerating ? (
          <div className="wanted-loading-placeholder">
            <div className="wanted-spinner" />
            <p>GENERATING VCPD FORENSIC CASE FILE #{dossier.caseFileNumber}...</p>
          </div>
        ) : activeDisplayUrl ? (
          <div className="wanted-poster-frame">
            <img
              src={activeDisplayUrl}
              alt="VCPD Most Wanted Dossier"
              className="wanted-poster-image"
            />
            {customEditedPoster && (
              <span className="wanted-custom-badge">
                EVIDENCE MODIFIED VIA REACT IMAGE EDITOR
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Criminal Profile & Case Indictment Breakdown */}
      <div className="wanted-dossier-details">
        {/* Bounty Callout Card */}
        <div className="wanted-bounty-card glass-panel">
          <div className="wanted-badge-header">
            <span className="vcpd-badge-icon">⭐</span>
            <div>
              <h3>OFFICIAL VCPD / FBI BOUNTY</h3>
              <p>CASE #{dossier.caseFileNumber}</p>
            </div>
          </div>
          <div className="wanted-bounty-amount">{dossier.bountyRewardFormatted}</div>
          <div className="wanted-status-row">
            <span>THREAT LEVEL:</span>
            <strong className="threat-tag">{dossier.threatLevel}</strong>
          </div>
          <div className="wanted-status-row">
            <span>WANTED STARS:</span>
            <span className="stars-tag">{'★'.repeat(dossier.wantedStars)}</span>
          </div>
          <div className="wanted-status-row">
            <span>HEIST TAKE:</span>
            <strong>{dossier.totalStolenFormatted}</strong>
          </div>
        </div>

        {/* Suspect Profiles Accordion */}
        <div className="wanted-suspects-card glass-panel">
          <h3>PRIMARY SUSPECT DOSSIERS ({dossier.suspects.length})</h3>
          <div className="suspect-tabs">
            {dossier.suspects.map((s, idx) => (
              <button
                key={s.crewId}
                className={`suspect-tab-btn ${activeSuspectTab === idx ? 'active' : ''}`}
                onClick={() => {
                  playSfx('select');
                  setActiveSuspectTab(idx);
                }}
                type="button"
              >
                {s.name}
              </button>
            ))}
          </div>

          {dossier.suspects[activeSuspectTab] && (
            <div className="suspect-active-dossier">
              <div className="suspect-mini-mugshot">
                <img
                  src={dossier.suspects[activeSuspectTab].portrait}
                  alt={dossier.suspects[activeSuspectTab].name}
                />
                <span className="suspect-booking-tag">
                  {dossier.suspects[activeSuspectTab].bookingNumber}
                </span>
              </div>
              <div className="suspect-mini-info">
                <h4>
                  {dossier.suspects[activeSuspectTab].name}{' '}
                  <span className="suspect-alias">
                    "{dossier.suspects[activeSuspectTab].alias}"
                  </span>
                </h4>
                <p>
                  <strong>ROLE:</strong> {dossier.suspects[activeSuspectTab].role.toUpperCase()}
                </p>
                <p>
                  <strong>PHYSICAL:</strong> {dossier.suspects[activeSuspectTab].height} •{' '}
                  {dossier.suspects[activeSuspectTab].weight}
                </p>
                <p>
                  <strong>STATUS:</strong>{' '}
                  <span className="status-highlight">
                    {dossier.suspects[activeSuspectTab].status}
                  </span>
                </p>
                <p className="suspect-warning">
                  ⚠️ {dossier.suspects[activeSuspectTab].specialtyWarning}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Procedural Criminal Indictment Sheet */}
        <div className="wanted-charges-card glass-panel">
          <h3>FEDERAL INDICTMENT & CHARGES</h3>
          <div className="charges-list">
            {dossier.charges.map((ch) => (
              <div key={ch.code} className="charge-item">
                <div className="charge-header">
                  <span className="charge-code">{ch.code}</span>
                  <span className="charge-severity">{ch.severity}</span>
                </div>
                <div className="charge-title">{ch.title}</div>
                <div className="charge-desc">{ch.description}</div>
              </div>
            ))}
          </div>
          <div className="investigator-footer">
            <span>LEAD: {dossier.leadInvestigator}</span>
            <span>JURISDICTION: {dossier.investigatingUnit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
