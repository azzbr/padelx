import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';

// Placeholder components for now - we'll create these next
const PlayerManager = ({ onViewChange }: { onViewChange: (view: string) => void }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Player Manager</h1>
    <div className="card p-8 text-center">
      <p className="text-gray-600 dark:text-gray-400">Player management coming soon...</p>
    </div>
  </div>
);

const MatchMaker = ({ onViewChange }: { onViewChange: (view: string) => void }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Match Maker</h1>
    <div className="card p-8 text-center">
      <p className="text-gray-600 dark:text-gray-400">Match making coming soon...</p>
    </div>
  </div>
);

const LiveMatch = ({ onViewChange }: { onViewChange: (view: string) => void }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Live Matches</h1>
    <div className="card p-8 text-center">
      <p className="text-gray-600 dark:text-gray-400">Live match tracking coming soon...</p>
    </div>
  </div>
);

const MatchHistory = ({ onViewChange }: { onViewChange: (view: string) => void }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Match History</h1>
    <div className="card p-8 text-center">
      <p className="text-gray-600 dark:text-gray-400">Match history coming soon...</p>
    </div>
  </div>
);

const Leaderboard = ({ onViewChange }: { onViewChange: (view: string) => void }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Leaderboard</h1>
    <div className="card p-8 text-center">
      <p className="text-gray-600 dark:text-gray-400">Leaderboard coming soon...</p>
    </div>
  </div>
);

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={setCurrentView} />;
      case 'players':
        return <PlayerManager onViewChange={setCurrentView} />;
      case 'matchmaker':
        return <MatchMaker onViewChange={setCurrentView} />;
      case 'live':
        return <LiveMatch onViewChange={setCurrentView} />;
      case 'history':
        return <MatchHistory onViewChange={setCurrentView} />;
      case 'leaderboard':
        return <Leaderboard onViewChange={setCurrentView} />;
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation currentView={currentView} onViewChange={setCurrentView} />
        <main className="pb-8">
          {renderCurrentView()}
        </main>
      </div>
    </AppProvider>
  );
}

export default App;
