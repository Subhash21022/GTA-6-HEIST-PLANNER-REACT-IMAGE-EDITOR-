import { useState } from 'react';
import { playSfx } from '../audio/soundManager';
import { formatCurrency, type HeistPayoutBreakdown } from '../config/payout';
import './HeistPayoutSplitter.css';

interface HeistPayoutSplitterProps {
  breakdown: HeistPayoutBreakdown;
  onCutChange: (crewId: string, newPercent: number) => void;
  onResetCuts: () => void;
  onStampOnBoard: () => void;
  onDownloadReceipt: () => void;
  receiptDataUrl: string | null;
  isStamping?: boolean;
}

export function HeistPayoutSplitter({
  breakdown,
  onCutChange,
  onResetCuts,
  onStampOnBoard,
  onDownloadReceipt,
  receiptDataUrl,
  isStamping = false,
}: HeistPayoutSplitterProps) {
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handleSliderChange = (crewId: string, newPercent: number) => {
    playSfx('cashTally', 0.85);
    onCutChange(crewId, newPercent);
  };

  return (
    <div className="payout-splitter-container hud-brackets">
      {/* ── TOP STATS ROW: TOTAL VAULT TAKE & EFFICIENCY ── */}
      <div className="payout-header-card">
        <div className="payout-header-item">
          <span className="payout-label">TARGET VAULT POTENTIAL:</span>
          <span className="payout-value text-sand">{formatCurrency(breakdown.potentialVaultTake)}</span>
        </div>

        <div className="payout-header-item">
          <span className="payout-label">EXECUTION EFFICIENCY:</span>
          <span className={`payout-badge grade-${breakdown.grade.toLowerCase()}`}>
            GRADE {breakdown.grade} ({breakdown.gradeEfficiencyPct}% RECOVERY)
          </span>
        </div>

        <div className="payout-header-item">
          <span className="payout-label">ACTUAL GROSS LOOT:</span>
          <span className="payout-value text-gold">{formatCurrency(breakdown.actualGrossTake)}</span>
        </div>
      </div>

      {/* ── MASTERMIND TAKE HERO CARD ── */}
      <div className="player-take-hero">
        <div className="player-take-info">
          <span className="player-take-tag">💼 MASTERMIND NET TAKE (YOUR CUT)</span>
          <span className="player-take-sub">
            {breakdown.playerCutPercent}% of gross loot wired directly to Caymans offshore account
          </span>
          {Boolean(breakdown.safeCrackedBonus) && (
            <div className="payout-safe-bonus-badge">
              💎 VAULT SAFE CRACKED: +{formatCurrency(breakdown.safeCrackedBonus!)} BEARER BONDS & DIAMONDS
            </div>
          )}
        </div>
        <div className="player-take-amount">
          <span className="player-take-number">{formatCurrency(breakdown.playerNetTake)}</span>
        </div>
      </div>

      {/* ── LOOT DISTRIBUTION & CREW CUT SLIDERS ── */}
      <div className="payout-split-section">
        <div className="payout-section-title">
          <span>CREW & SYNDICATE ALLOCATION</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onResetCuts}>
            ↺ Reset Cuts
          </button>
        </div>

        {/* Fixed Syndicate Fence Fee */}
        <div className="cut-row fixed-cut">
          <div className="cut-member-info">
            <span className="cut-avatar fence-avatar">🕶️</span>
            <div>
              <span className="cut-name">Vice City Syndicate & Laundering</span>
              <span className="cut-role">Offshore Wire & Cleaning (Fixed 10%)</span>
            </div>
          </div>
          <div className="cut-amount-col">
            <span className="cut-pct">10%</span>
            <span className="cut-dollars text-danger">-{formatCurrency(breakdown.syndicateAmount)}</span>
          </div>
        </div>

        {/* Dynamic Crew Member Sliders */}
        {breakdown.crewCuts.length === 0 ? (
          <div className="no-crew-note">
            <span>No specialist crew recruited. Solo operator receives maximum loot cut!</span>
          </div>
        ) : (
          breakdown.crewCuts.map((crew) => (
            <div key={crew.crewId} className="cut-row">
              <div className="cut-member-info">
                <span className="cut-avatar" style={{ background: '#1a1f32' }}>
                  {crew.avatar ? (
                    <img src={crew.avatar} alt={crew.name} className="cut-avatar-img" />
                  ) : (
                    crew.name[0]
                  )}
                </span>
                <div>
                  <span className="cut-name">{crew.name}</span>
                  <span className="cut-role">{crew.role}</span>
                </div>
              </div>

              {/* Interactive Cut Slider */}
              <div className="cut-slider-container">
                <input
                  type="range"
                  min={5}
                  max={25}
                  step={1}
                  value={crew.percent}
                  onChange={(e) => handleSliderChange(crew.crewId, parseInt(e.target.value, 10))}
                  className="cut-range-input"
                />
                <span className="cut-pct-badge">{crew.percent}%</span>
              </div>

              <div className="cut-amount-col">
                <span className="cut-dollars text-danger">-{formatCurrency(crew.amount)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── ACTION CONTROLS & RECEIPT PREVIEW ── */}
      <div className="payout-actions-bar">
        <button
          type="button"
          className="btn btn-primary btn-stamp-receipt"
          onClick={onStampOnBoard}
          disabled={isStamping}
        >
          🧾 STAMP RECEIPT IN REACT IMAGE EDITOR
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowReceiptModal(true)}
          disabled={!receiptDataUrl}
        >
          👁️ PREVIEW SLIP
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={onDownloadReceipt}
          disabled={!receiptDataUrl}
        >
          📥 DOWNLOAD SLIP (PNG)
        </button>
      </div>

      {/* ── RECEIPT SLIP POPUP MODAL ── */}
      {showReceiptModal && receiptDataUrl && (
        <div className="receipt-modal-backdrop" onClick={() => setShowReceiptModal(false)}>
          <div className="receipt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <h3>OFFICIAL WIRE TRANSFER SETTLEMENT SLIP</h3>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setShowReceiptModal(false)}
              >
                ✕ Close
              </button>
            </div>
            <div className="receipt-modal-img-wrap">
              <img src={receiptDataUrl} alt="Wire Transfer Slip" className="receipt-slip-img" />
            </div>
            <div className="receipt-modal-footer">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setShowReceiptModal(false);
                  onStampOnBoard();
                }}
              >
                🧾 Open & Stamp in React Image Editor
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onDownloadReceipt}>
                📥 Download PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
