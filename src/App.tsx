import React from 'react';
import { useStore, type Screen } from './store';
import { TitleScreen } from './screens/TitleScreen';
import { TargetScreen } from './screens/TargetScreen';
import { ApproachScreen } from './screens/ApproachScreen';
import { CrewScreen } from './screens/CrewScreen';
import { PlanningScreen } from './screens/PlanningScreen';
import { PlaybackScreen } from './screens/PlaybackScreen';
import { BriefingScreen } from './screens/BriefingScreen';
import { ResultScreen } from './screens/ResultScreen';
import { ToastContainer } from './ui/Toast';
import { NarrowScreen } from './ui/NarrowScreen';
import { ScreenBackground } from './ui/ScreenBackground';
import { AudioToggle } from './ui/AudioToggle';
import { NeonShutterTransition } from './ui/NeonShutterTransition';
import { SpeedInsights } from '@vercel/speed-insights/react';

const SCREENS: Record<Screen, () => React.JSX.Element> = {
  title: () => <TitleScreen />,
  target: () => <TargetScreen />,
  approach: () => <ApproachScreen />,
  crew: () => <CrewScreen />,
  infiltration: () => <PlanningScreen stage="infiltration" />,
  getaway: () => <PlanningScreen stage="getaway" />,
  playback: () => <PlaybackScreen />,
  briefing: () => <BriefingScreen />,
  result: () => <ResultScreen />,
};

function App() {
  const screen = useStore((s) => s.screen);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <NarrowScreen />
      <ScreenBackground screen={screen} />
      <AudioToggle />
      <main id="main-content" className="app">
        <NeonShutterTransition
          screen={screen}
          renderScreen={(s) => {
            const ScreenComponent = SCREENS[s];
            return <ScreenComponent />;
          }}
        />
      </main>
      <ToastContainer />
      <SpeedInsights />
    </>
  );
}

export default App;
