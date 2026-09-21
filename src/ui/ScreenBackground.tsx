import type { Screen } from '../store';
import './ScreenBackground.css';

interface ScreenBgConfig {
  image: string;
  opacity: number;
}

const SCREEN_BG_CONFIG: Partial<Record<Screen, ScreenBgConfig>> = {
  target: { image: '/images/bg-target.jpg', opacity: 0.58 },
  approach: { image: '/images/bg-planning.jpg', opacity: 0.52 },
  crew: { image: '/images/bg-crew.jpg', opacity: 0.55 },
  infiltration: { image: '/images/bg-planning.jpg', opacity: 0.50 },
  getaway: { image: '/images/bg-planning.jpg', opacity: 0.50 },
  playback: { image: '/images/bg-playback.jpg', opacity: 0.54 },
  briefing: { image: '/images/bg-planning.jpg', opacity: 0.50 },
  result: { image: '/images/bg-result.jpg', opacity: 0.58 },
};

export function ScreenBackground({ screen }: { screen: Screen }) {
  const currentConfig = SCREEN_BG_CONFIG[screen];

  if (!currentConfig) return null;

  return (
    <div className="screen-bg-layer" aria-hidden="true">
      <img
        key={currentConfig.image}
        src={currentConfig.image}
        alt=""
        className="screen-bg-img"
        style={{ opacity: currentConfig.opacity }}
      />
      <div className="screen-bg-overlay" />
    </div>
  );
}
