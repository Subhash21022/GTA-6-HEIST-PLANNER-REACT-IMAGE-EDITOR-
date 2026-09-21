import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

if (typeof document !== 'undefined' && 'fonts' in document) {
  Promise.all([
    document.fonts.load('16px Pricedown'),
    document.fonts.load('16px Chalet'),
  ]).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
