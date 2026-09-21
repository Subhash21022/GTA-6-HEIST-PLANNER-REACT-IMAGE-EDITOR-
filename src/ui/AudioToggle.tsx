import React, { useState, useEffect, useRef } from 'react';
import { soundManager } from '../audio/soundManager';
import './AudioToggle.css';

export function AudioToggle() {
  const [isMuted, setIsMuted] = useState(() => soundManager.getIsMuted());
  const [volume, setVolume] = useState(() => soundManager.getVolume());
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return soundManager.subscribe((muted, vol) => {
      setIsMuted(muted);
      setVolume(vol);
    });
  }, []);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.toggleMute();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value) / 100;
    soundManager.setVolume(newVol);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = 0.05;
    const delta = e.deltaY < 0 ? step : -step;
    soundManager.setVolume(volume + delta);
  };

  const isExpanded = isHovered || isDragging;
  const currentVolumePercent = isMuted ? 0 : Math.round(volume * 100);

  return (
    <div
      ref={containerRef}
      className={`sound-widget ${isMuted ? 'muted' : 'active'} ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsHovered(false);
      }}
      onWheel={handleWheel}
      title={isMuted ? 'Sound: Muted (Click to Unmute, [M])' : `Sound: ${currentVolumePercent}% (Click to Mute, Scroll to adjust, [M])`}
    >
      {/* Sound Symbol Button */}
      <button
        type="button"
        className="sound-symbol-btn"
        onClick={handleToggleMute}
        aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        data-sfx="none"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="sound-icon"
        >
          {/* Speaker cone */}
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />

          {/* Sound waves or mute indicator */}
          {isMuted || volume === 0 ? (
            <>
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </>
          ) : (
            <>
              {/* Wave 1: Low Volume */}
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              {/* Wave 2: Medium Volume */}
              {volume > 0.35 && (
                <path d="M18.5 5.5a9 9 0 0 1 0 13" />
              )}
              {/* Wave 3: High Volume */}
              {volume > 0.70 && (
                <path d="M21.5 2.5a13 13 0 0 1 0 19" />
              )}
            </>
          )}
        </svg>
      </button>

      {/* Expandable Volume Slider & Value */}
      <div className="sound-slider-wrapper">
        <input
          type="range"
          min="0"
          max="100"
          value={currentVolumePercent}
          onChange={handleVolumeChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => {
            setIsDragging(false);
          }}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => {
            setIsDragging(false);
          }}
          className="sound-slider"
          aria-label="Sound volume"
          data-sfx="none"
        />
        <span className="sound-percent-label">{currentVolumePercent}%</span>
      </div>
    </div>
  );
}
