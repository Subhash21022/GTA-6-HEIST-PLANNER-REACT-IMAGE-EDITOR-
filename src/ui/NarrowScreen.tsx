import { useState } from 'react';
import './NarrowScreen.css';

export function NarrowScreen() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="narrow-banner" role="status">
      <span className="narrow-banner-icon">&#9000;</span>
      <span>Best on desktop — some features may be limited on mobile</span>
      <button
        className="narrow-banner-dismiss"
        onClick={() => setDismissed(true)}
        type="button"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
