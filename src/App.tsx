import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore, type Screen } from './store';
import { TitleScreen } from './screens/TitleScreen';
import { TargetScreen } from './screens/TargetScreen';
import { CrewScreen } from './screens/CrewScreen';
import { PlanningScreen } from './screens/PlanningScreen';
import { PlaybackScreen } from './screens/PlaybackScreen';
import { BriefingScreen } from './screens/BriefingScreen';
import { ResultScreen } from './screens/ResultScreen';
import { ToastContainer } from './ui/Toast';
import { NarrowScreen } from './ui/NarrowScreen';

gsap.registerPlugin();

const SCREENS: Record<Screen, () => React.JSX.Element> = {
  title: () => <TitleScreen />,
  target: () => <TargetScreen />,
  crew: () => <CrewScreen />,
  infiltration: () => <PlanningScreen stage="infiltration" />,
  getaway: () => <PlanningScreen stage="getaway" />,
  playback: () => <PlaybackScreen />,
  briefing: () => <BriefingScreen />,
  result: () => <ResultScreen />,
};

function App() {
  const screen = useStore((s) => s.screen);
  const ScreenComponent = SCREENS[screen];
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = containerRef.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        el,
        {
          opacity: 0,
          clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
        },
        {
          opacity: 1,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          duration: 0.6,
          ease: 'power4.out',
        },
      );
    });
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set(el, { opacity: 1, clipPath: 'none' });
    });
  }, { dependencies: [screen], revertOnUpdate: true });

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <NarrowScreen />
      <main id="main-content" className="app" ref={containerRef}>
        <ScreenComponent />
      </main>
      <ToastContainer />
    </>
  );
}

export default App;
