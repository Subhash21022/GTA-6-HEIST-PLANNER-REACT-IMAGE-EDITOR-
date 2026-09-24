import { useEffect, useState } from 'react';
import { radioDispatch } from '../audio/radioDispatch';
import type { PoliceDispatchMessage } from '../config/wantedLevel';
import type { VoicePersonaMetadata } from '../audio/voiceManager';
import './PoliceScanner.css';

interface PoliceScannerProps {
  className?: string;
}

export function PoliceScanner({ className = '' }: PoliceScannerProps) {
  const [currentMsg, setCurrentMsg] = useState<PoliceDispatchMessage | null>(() =>
    radioDispatch.getCurrentMessage(),
  );
  const [currentPersona, setCurrentPersona] = useState<VoicePersonaMetadata | null>(() =>
    radioDispatch.getCurrentPersona(),
  );
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return radioDispatch.subscribe((msg, speaking, persona) => {
      setCurrentMsg(msg);
      setIsSpeaking(speaking);
      setCurrentPersona(persona);
    });
  }, []);

  const handleTestSquelch = () => {
    radioDispatch.triggerManualSquelch();
  };

  const handleNextDispatch = () => {
    radioDispatch.broadcastNext();
  };

  const handleNewsAnchorReport = () => {
    radioDispatch.broadcastAnchorReport();
  };

  const personaColor = currentPersona?.color || '#00f0ff';

  return (
    <div
      className={`police-scanner hud-brackets ${className} ${isSpeaking ? 'transmitting' : ''}`}
      style={{
        borderColor: isSpeaking ? personaColor : undefined,
        boxShadow: isSpeaking ? `0 4px 24px rgba(0, 0, 0, 0.7), 0 0 20px ${personaColor}55` : undefined,
      }}
    >
      <div className="scanner-header">
        <div className="scanner-channel-badge">
          <span className="scanner-rec-dot" style={{ background: isSpeaking ? personaColor : '#00ffa3' }} />
          <span className="scanner-channel-text">
            {currentMsg?.channel || 'VCPD TAC-1 // 460.125 MHz'}
          </span>
        </div>

        {/* Dynamic Voice Persona Badge */}
        {currentPersona && (
          <div
            className={`scanner-voice-pill ${isSpeaking ? 'pulse-speaking' : ''}`}
            style={{
              borderColor: `${personaColor}88`,
              backgroundColor: `${personaColor}15`,
            }}
            title={`Active Speaker: ${currentPersona.voiceDescription}`}
          >
            <span className="scanner-voice-icon">{currentPersona.badgeIcon}</span>
            <span className="scanner-voice-name" style={{ color: personaColor }}>
              {currentPersona.voiceDescription}
            </span>
          </div>
        )}

        {/* Live Audio Equalizer Waveform */}
        <div className="scanner-waveforms" title="Live Frequency Carrier Waveform">
          <span
            className={`wave-bar ${isSpeaking ? 'animating' : ''}`}
            style={{ backgroundColor: isSpeaking ? personaColor : undefined, animationDelay: '0.0s' }}
          />
          <span
            className={`wave-bar ${isSpeaking ? 'animating' : ''}`}
            style={{ backgroundColor: isSpeaking ? personaColor : undefined, animationDelay: '0.15s' }}
          />
          <span
            className={`wave-bar ${isSpeaking ? 'animating' : ''}`}
            style={{ backgroundColor: isSpeaking ? personaColor : undefined, animationDelay: '0.3s' }}
          />
          <span
            className={`wave-bar ${isSpeaking ? 'animating' : ''}`}
            style={{ backgroundColor: isSpeaking ? personaColor : undefined, animationDelay: '0.1s' }}
          />
          <span
            className={`wave-bar ${isSpeaking ? 'animating' : ''}`}
            style={{ backgroundColor: isSpeaking ? personaColor : undefined, animationDelay: '0.25s' }}
          />
          <span
            className={`wave-bar ${isSpeaking ? 'animating' : ''}`}
            style={{ backgroundColor: isSpeaking ? personaColor : undefined, animationDelay: '0.05s' }}
          />
        </div>

        {/* Interactive Audio Controls */}
        <div className="scanner-controls">
          <button
            type="button"
            className="scanner-btn"
            onClick={handleTestSquelch}
            title="Trigger Authentic Police Radio Mic Squelch"
          >
            📻 SQUELCH
          </button>
          <button
            type="button"
            className="scanner-btn"
            onClick={handleNextDispatch}
            title="Next Radio Call (Rotates between Dispatcher, Pursuit Cop, Chopper, SWAT)"
          >
            ▶ NEXT CALL
          </button>
          <button
            type="button"
            className="scanner-btn scanner-btn-anchor"
            onClick={handleNewsAnchorReport}
            title="Broadcast Weazel News TV Breaking News Report (Anchor Voice)"
          >
            🎙️ TV NEWS REPORT
          </button>
        </div>
      </div>

      <div className="scanner-body">
        <div className="scanner-callsign">
          <span className="scanner-speaker-icon">{currentPersona?.badgeIcon || '👮'}</span>
          <span className="callsign-tag" style={{ color: personaColor }}>
            {currentMsg?.callsign || 'VCPD DISPATCH'}:
          </span>
          <span className="unit-tag">{currentMsg?.unit || 'CENTRAL 10'}</span>
        </div>
        <div className="scanner-transcript">
          "{currentMsg?.message || 'Monitoring VCPD tactical frequency. All units maintain station.'}"
        </div>
      </div>
    </div>
  );
}
