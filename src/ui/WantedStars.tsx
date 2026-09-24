import { useEffect, useRef } from 'react';
import type { WantedLevelInfo } from '../config/wantedLevel';
import { playSfx } from '../audio/soundManager';
import './WantedStars.css';

interface WantedStarsProps {
  wantedInfo: WantedLevelInfo;
  showDetails?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function WantedStars({
  wantedInfo,
  showDetails = true,
  className = '',
  size = 'md',
}: WantedStarsProps) {
  const prevStarsRef = useRef<number>(wantedInfo.stars);

  // Play ominous GTA wanted level star sound when stars change
  useEffect(() => {
    if (prevStarsRef.current !== wantedInfo.stars) {
      playSfx('wantedStar');
      prevStarsRef.current = wantedInfo.stars;
    }
  }, [wantedInfo.stars]);

  const handleStarClick = () => {
    playSfx('wantedStar', 1.0);
  };

  const totalStars = 5;

  return (
    <div
      className={`wanted-stars-container wanted-${size} ${className}`}
      onClick={handleStarClick}
      title={`${wantedInfo.title} — Click to hear Wanted Sound`}
      role="button"
      tabIndex={0}
      data-sfx="none"
    >
      <div className="wanted-stars-row">
        {Array.from({ length: totalStars }).map((_, i) => {
          const starNum = i + 1;
          const isActive = starNum <= wantedInfo.stars;

          return (
            <span
              key={starNum}
              className={`gta-star ${isActive ? 'active flashing' : 'inactive'}`}
              style={{
                color: isActive ? wantedInfo.color : 'rgba(255, 255, 255, 0.16)',
                textShadow: isActive ? `0 0 16px ${wantedInfo.glowColor}, 0 0 30px ${wantedInfo.glowColor}` : 'none',
              }}
            >
              ★
            </span>
          );
        })}
      </div>

      {showDetails && (
        <div className="wanted-details">
          <span className="wanted-title" style={{ color: wantedInfo.color }}>
            {wantedInfo.title}
          </span>
          <span className="wanted-status">
            {wantedInfo.statusText}
          </span>
        </div>
      )}
    </div>
  );
}
