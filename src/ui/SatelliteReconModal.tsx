import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { TARGETS, type Target } from '../config/targets';
import {
  renderSatelliteOrthophoto,
  type SatelliteSpectrum,
} from '../render/satellite';
import { EditorModal } from '../editor/EditorModal';
import { SATELLITE_RECON_TOOLS } from '../editor/toolConfigs';
import type { ImageEditorSaveResult } from '@unlayer/react-image-editor';
import { playSfx } from '../audio/soundManager';
import { downloadDataUrl } from '../utils/canvas';
import './SatelliteReconModal.css';

interface SatelliteReconModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetOverride?: Target | null;
}

export function SatelliteReconModal({
  isOpen,
  onClose,
  targetOverride,
}: SatelliteReconModalProps) {
  const storeTarget = useStore((s) => s.target);
  const target = targetOverride || storeTarget || TARGETS[0];
  const satelliteImage = useStore((s) => s.satelliteImage);
  const setSatelliteImage = useStore((s) => s.setSatelliteImage);
  const satelliteSpectrum = useStore((s) => s.satelliteSpectrum);
  const setSatelliteSpectrum = useStore((s) => s.setSatelliteSpectrum);
  const satelliteReconCompleted = useStore((s) => s.satelliteReconCompleted);
  const setSatelliteReconCompleted = useStore((s) => s.setSatelliteReconCompleted);
  const satelliteJammersPlaced = useStore((s) => s.satelliteJammersPlaced);
  const setSatelliteJammersPlaced = useStore((s) => s.setSatelliteJammersPlaced);
  const satelliteSniperPings = useStore((s) => s.satelliteSniperPings);
  const setSatelliteSniperPings = useStore((s) => s.setSatelliteSniperPings);
  const addToast = useStore((s) => s.addToast);

  const [activeSpectrum, setActiveSpectrum] = useState<SatelliteSpectrum>(satelliteSpectrum || 'flir');
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentBaseOrthophoto, setCurrentBaseOrthophoto] = useState<string | null>(null);
  const [cloudDrift, setCloudDrift] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // Sync active spectrum with store
  useEffect(() => {
    setSatelliteSpectrum(activeSpectrum);
  }, [activeSpectrum, setSatelliteSpectrum]);

  // Generate initial or updated spectrum orthophoto
  useEffect(() => {
    if (!isOpen || !target) return;
    const result = renderSatelliteOrthophoto(target, activeSpectrum, cloudDrift);
    setCurrentBaseOrthophoto(result.dataUrl);
  }, [isOpen, target, activeSpectrum, cloudDrift]);

  // Cloud drift animation for optical mode
  useEffect(() => {
    if (!isOpen || activeSpectrum !== 'optical') return;
    const interval = setInterval(() => {
      setCloudDrift((prev) => prev + 1);
    }, 200);
    return () => clearInterval(interval);
  }, [isOpen, activeSpectrum]);

  // Play satellite sync sound on mount
  useEffect(() => {
    if (isOpen) {
      playSfx('satelliteDownlinkChime', 0.85);
    }
  }, [isOpen]);

  // Switch active optical spectrum
  const handleSpectrumChange = (spec: SatelliteSpectrum) => {
    if (spec === activeSpectrum) return;
    playSfx('satelliteSpectrumSwitch', 0.85);
    setActiveSpectrum(spec);
    setSatelliteSpectrum(spec);
    if (target) {
      const result = renderSatelliteOrthophoto(target, spec, cloudDrift);
      setCurrentBaseOrthophoto(result.dataUrl);
      setSatelliteImage(result.dataUrl);
    }
  };

  // Quick Action: Deploy EMP Jammer Beacon
  const handleDeployJammer = () => {
    if (satelliteJammersPlaced >= 2) {
      addToast('Maximum EMP Jammers deployed (2/2)');
      return;
    }
    playSfx('empJammerDeploy', 0.95);
    const nextCount = satelliteJammersPlaced + 1;
    setSatelliteJammersPlaced(nextCount);
    addToast(`⚡ EMP Jammer Beacon #${nextCount} active: Exterior surveillance disrupted`);
  };

  // Quick Action: Designate Sniper Overwatch Corridor
  const handleDesignateSniper = () => {
    if (satelliteSniperPings >= 2) {
      addToast('Maximum Sniper Overwatch corridors designated (2/2)');
      return;
    }
    playSfx('satelliteTargetLocked', 0.95);
    const nextCount = satelliteSniperPings + 1;
    setSatelliteSniperPings(nextCount);
    addToast(`🎯 Sniper Overwatch #${nextCount} locked: Rooftop guard neutralized`);
  };

  // Launch React Image Editor
  const handleOpenEditor = () => {
    playSfx('select');
    setEditorOpen(true);
  };

  // Handle Save from React Image Editor
  const handleEditorSave = useCallback(
    (result: ImageEditorSaveResult) => {
      setSatelliteImage(result.dataUrl);
      setCurrentBaseOrthophoto(result.dataUrl);
      setSatelliteReconCompleted(true);
      setEditorOpen(false);
      playSfx('satelliteTargetLocked', 1.0);
      playSfx('cashTally', 0.9);
      addToast('🛰️ ORBITAL RECON INTEL LOCKED: +$250,000 & HAZARD MITIGATION APPLIED!');
    },
    [setSatelliteImage, setSatelliteReconCompleted, addToast],
  );

  // Download high-resolution satellite orthophoto
  const handleDownload = () => {
    const imgToDownload = currentBaseOrthophoto || satelliteImage;
    if (!imgToDownload) return;
    setIsDownloading(true);
    playSfx('cameraShutter');
    downloadDataUrl(
      imgToDownload,
      `LEONIDA-KH12-SATELLITE-${target.id.toUpperCase()}-${activeSpectrum.toUpperCase()}.png`,
    );
    setTimeout(() => setIsDownloading(false), 800);
  };

  if (!isOpen || !target) return null;

  const displayImage = currentBaseOrthophoto || satelliteImage;

  return (
    <div className="satellite-modal-overlay">
      <div className="satellite-modal-backdrop" onClick={onClose} />

      <div className="satellite-modal-container hud-brackets">
        {/* ── SATELLITE HUD TOP BAR ── */}
        <header className="satellite-modal-header">
          <div className="satellite-header-left">
            <div className="satellite-status-pill">
              <span className="live-dot" />
              <span>ORBITAL DOWNLINK ACTIVE</span>
            </div>
            <h2 className="satellite-platform-title">
              USA-245 // KH-12 KEYHOLE • ORBITAL RECON
            </h2>
          </div>

          <div className="satellite-telemetry-readouts">
            <div className="telemetry-block">
              <span className="telemetry-label">ALTITUDE</span>
              <span className="telemetry-value">420.8 KM</span>
            </div>
            <div className="telemetry-block">
              <span className="telemetry-label">VELOCITY</span>
              <span className="telemetry-value">7.66 KM/S</span>
            </div>
            <div className="telemetry-block">
              <span className="telemetry-label">GROUND RES</span>
              <span className="telemetry-value text-cyan">0.12 M/PX</span>
            </div>
            <button type="button" className="btn btn-ghost btn-sm close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </header>

        {/* ── SPECTRUM CONTROLS TOOLBAR ── */}
        <div className="satellite-spectrum-toolbar">
          <div className="spectrum-btn-group">
            <span className="spectrum-label">OPTICAL SPECTRUM:</span>
            <button
              type="button"
              className={`spectrum-btn ${activeSpectrum === 'flir' ? 'active flir' : ''}`}
              onClick={() => handleSpectrumChange('flir')}
            >
              🔥 THERMAL (FLIR)
            </button>
            <button
              type="button"
              className={`spectrum-btn ${activeSpectrum === 'optical' ? 'active optical' : ''}`}
              onClick={() => handleSpectrumChange('optical')}
            >
              ☀️ TRUE COLOR (OPTICAL)
            </button>
            <button
              type="button"
              className={`spectrum-btn ${activeSpectrum === 'nvg' ? 'active nvg' : ''}`}
              onClick={() => handleSpectrumChange('nvg')}
            >
              👁️ NIGHT VISION (NVG)
            </button>
            <button
              type="button"
              className={`spectrum-btn ${activeSpectrum === 'wireframe' ? 'active wireframe' : ''}`}
              onClick={() => handleSpectrumChange('wireframe')}
            >
              ⚡ EM WIREFRAME (X-RAY)
            </button>
          </div>

          {/* Satellite Intel Status Badge */}
          <div className="satellite-intel-status">
            {satelliteReconCompleted ? (
              <span className="intel-badge confirmed">
                ✓ ORBITAL INTEL LOCKED (+$250K)
              </span>
            ) : (
              <span className="intel-badge pending">
                ⚡ INTEL MARKUP REQUIRED
              </span>
            )}
          </div>
        </div>

        {/* ── MAIN CONTENT LAYOUT ── */}
        <div className="satellite-body-grid">
          {/* SATELLITE CANVAS PREVIEW */}
          <div className="satellite-preview-wrap hud-brackets">
            {displayImage ? (
              <img
                src={displayImage}
                alt={`${target.name} Satellite Orthophoto`}
                className="satellite-orthophoto-img"
              />
            ) : (
              <div className="satellite-loading-box">
                <div className="editor-modal-spinner" />
                <span>ESTABLISHING SECURE SATELLITE FEED...</span>
              </div>
            )}

            {/* Scanning Laser Reticle Overlay */}
            <div className="satellite-scan-line" />

            {/* Target Stamp Watermark */}
            <div className="satellite-overlay-target-tag">
              <span>TARGET SECTOR: {target.name.toUpperCase()}</span>
              <span>COORDS: 25°46'18.2"N 80°11'30.5"W</span>
            </div>

            {satelliteImage && (
              <div className="satellite-edited-pill">
                ★ ANNOTATED IN REACT IMAGE EDITOR
              </div>
            )}
          </div>

          {/* SATELLITE TACTICAL INTEL SIDEBAR */}
          <aside className="satellite-sidebar">
            <div className="tactical-panel glass-panel">
              <h3 className="sidebar-heading">ORBITAL TACTICAL SENSORS</h3>
              <p className="sidebar-desc">
                High-altitude orthophoto captures thermal plumes, guard patrols, and structural weaknesses across <strong>{target.name}</strong>.
              </p>

              <div className="sensor-readout-list">
                <div className="sensor-row">
                  <span>HVAC Transformers:</span>
                  <strong className="text-amber">4 Units (+48°C Thermal Plume)</strong>
                </div>
                <div className="sensor-row">
                  <span>Rooftop Helipad:</span>
                  <strong className="text-cyan">LZ-01 Clear (Diameter: 18m)</strong>
                </div>
                <div className="sensor-row">
                  <span>Perimeter Guards:</span>
                  <strong className="text-red">4 Thermal Signatures (37.2°C)</strong>
                </div>
                <div className="sensor-row">
                  <span>Subterranean Vault:</span>
                  <strong className="text-gold">Level -2 Reinforced Concrete</strong>
                </div>
              </div>
            </div>

            {/* QUICK TACTICAL PRESETS */}
            <div className="tactical-panel glass-panel">
              <h3 className="sidebar-heading">TACTICAL SATELLITE COUNTERMEASURES</h3>
              <div className="quick-actions-grid">
                <button
                  type="button"
                  className={`btn btn-sm ${satelliteJammersPlaced > 0 ? 'btn-active-tactical' : 'btn-secondary'}`}
                  onClick={handleDeployJammer}
                  title="Deploy electronic pulse jammer over the electrical substation"
                >
                  ⚡ EMP Jammer [{satelliteJammersPlaced}/2]
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${satelliteSniperPings > 0 ? 'btn-active-tactical' : 'btn-secondary'}`}
                  onClick={handleDesignateSniper}
                  title="Designate rooftop sniper overwatch firing lane"
                >
                  🎯 Sniper Overwatch [{satelliteSniperPings}/2]
                </button>
              </div>

              <div className="bonus-impact-note">
                <span>🛰️ REWARD: <strong>+$250,000</strong> Orbital Intel Bonus + <strong>-50%</strong> Camera Detection Penalties!</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="satellite-actions-col">
              <button
                type="button"
                className="btn btn-primary btn-large launch-editor-btn"
                onClick={handleOpenEditor}
              >
                🛰️ {satelliteImage ? 'RE-OPEN IN REACT IMAGE EDITOR' : 'LAUNCH SATELLITE RECON EDITOR'}
              </button>

              <div className="secondary-btns-row">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  📥 Export 1080p Orthophoto
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* ── FOOTER BAR ── */}
        <footer className="satellite-modal-footer">
          <div className="footer-directive">
            <span>DIRECTIVE:</span> Use React Image Editor to draw laser designators, drop EMP beacons, and mark rooftop landing zones before infiltration.
          </div>
          <div className="footer-branding">
            KH-12 ORBITAL RECON • POWERED BY @UNLAYER/REACT-IMAGE-EDITOR
          </div>
        </footer>
      </div>

      {/* ── EMBEDDED REACT IMAGE EDITOR MODAL ── */}
      {editorOpen && displayImage && (
        <EditorModal
          title={`KH-12 Satellite Recon — ${target.name} [${activeSpectrum.toUpperCase()}]`}
          image={displayImage}
          tools={SATELLITE_RECON_TOOLS}
          onSave={handleEditorSave}
          onCancel={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}
