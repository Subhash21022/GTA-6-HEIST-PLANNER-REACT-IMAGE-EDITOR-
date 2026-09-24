import { useEffect, useState } from 'react';
import { radioDispatch } from '../audio/radioDispatch';
import type { PoliceDispatchMessage } from '../config/wantedLevel';
import './PoliceScanner.css';

interface PoliceScannerProps {
  className?: string;
}

export function PoliceScanner({ className = '' }: PoliceScannerProps) {
  const [currentMsg, setCurrentMsg] = useState<PoliceDispatchMessage | null>(() =>
    radioDispatch.getCurrentMessage(),
  );
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return radioDispatch.subscribe((msg, speaking) => {
      setCurrentMsg(msg);
      setIsSpeaking(speaking);
    });
  }, []);

  const handleTestSquelch = () => {
    radioDispatch.triggerManualSquelch();
  };

  const handleNextDispatch = () => {
    radioDispatch.broadcastNext();
  };

  return (
    <div className={`police-scanner hud-brackets ${className} ${isSpeaking ? 'transmitting' : ''}`}>
      <div className="scanner-header">
        <div className="scanner-channel-badge">
          <span className="scanner-rec-dot" />
          <span className="scanner-channel-text">
            {currentMsg?.channel || 'VCPD TAC-1 // 460.125 MHz'}
          </span>
        </div>

        {/* Live Audio Equalizer Waveform */}
        <div className="scanner-waveforms" title="Live Police Radio Frequency Carrier">
          <span className={`wave-bar ${isSpeaking ? 'animating' : ''}`} style={{ animationDelay: '0.0s' }} />
          <span className={`wave-bar ${isSpeaking ? 'animating' : ''}`} style={{ animationDelay: '0.15s' }} />
          <span className={`wave-bar ${isSpeaking ? 'animating' : ''}`} style={{ animationDelay: '0.3s' }} />
          <span className={`wave-bar ${isSpeaking ? 'animating' : ''}`} style={{ animationDelay: '0.1s' }} />
          <span className={`wave-bar ${isSpeaking ? 'animating' : ''}`} style={{ animationDelay: '0.25s' }} />
          <span className={`wave-bar ${isSpeaking ? 'animating' : ''}`} style={{ animationDelay: '0.05s' }} />
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
            title="Next Police Dispatch Transmission"
          >
            ▶ NEXT CALL
          </button>
        </div>
      </div>

      <div className="scanner-body">
        <div className="scanner-callsign">
          <span className="callsign-tag">{currentMsg?.callsign || 'VCPD DISPATCH'}:</span>
          <span className="unit-tag">{currentMsg?.unit || 'CENTRAL 10'}</span>
        </div>
        <div className="scanner-transcript">
          "{currentMsg?.message || 'Monitoring VCPD tactical frequency. All units maintain station.'}"
        </div>
      </div>
    </div>
  );
}
