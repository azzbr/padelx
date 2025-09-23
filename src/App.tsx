import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import RegisterSocialPlay from './components/RegisterSocialPlay';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <main className="pb-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/players" element={<PlayerManager />} />
            <Route path="/matchmaker" element={<MatchMaker />} />
            <Route path="/register-play" element={<RegisterSocialPlay />} />
            <Route path="/tournament" element={<TournamentBracket />} />
            <Route path="/live" element={<LiveMatch />} />
            <Route path="/history" element={<MatchHistory />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/settings" element={<Settings />} />
            {/* Catch all route - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
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
