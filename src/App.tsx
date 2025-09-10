import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import PlayerManager from './components/PlayerManager';
import MatchMaker from './components/MatchMaker';
import LiveMatch from './components/LiveMatch';
import MatchHistory from './components/MatchHistory';
import Leaderboard from './components/Leaderboard';
import Settings from './components/Settings';
import TournamentBracket from './components/TournamentBracket';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
      case 'tournament':
        return <TournamentBracket onViewChange={setCurrentView} />;
      case 'live':
        return <LiveMatch onViewChange={setCurrentView} />;
      case 'history':
        return <MatchHistory onViewChange={setCurrentView} />;
      case 'leaderboard':
        return <Leaderboard onViewChange={setCurrentView} />;
      case 'settings':
        return <Settings onViewChange={setCurrentView} />;
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
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </AppProvider>
  );
}

export default App;
