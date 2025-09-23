import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useAppActions } from '../context/AppContext';
import {
  Users,
  Calendar,
  Play,
  Trophy,
  Plus,
  Database,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Save
} from 'lucide-react';
import { rankPlayers, getTopPerformers, calculateWinRate } from '../utils/calculations';
import { exportData, importData, clearAllData } from '../utils/storage';

export default function Dashboard() {
  const navigate = useNavigate();
  const { state } = useApp();
  const { loadSampleData } = useAppActions();

  // Calculate dashboard stats
  const availableToday = state.players.filter(p =>
    p.availability.includes(new Date().toISOString().split('T')[0])
  ).length;

  const liveMatches = state.matches.filter(m => m.status === 'live').length;
  const completedMatches = state.matches.filter(m => m.status === 'completed').length;

  const rankedPlayers = rankPlayers(state.players);
  const topPerformers = getTopPerformers(state.players);

  const recentMatches = state.matches
    .filter(m => m.status === 'completed')
    .sort((a, b) => new Date(b.endTime || '').getTime() - new Date(a.endTime || '').getTime())
    .slice(0, 3);

  const quickActions = [
    {
      title: 'Add Player',
      description: 'Add a new player to the system',
      icon: Plus,
      action: () => navigate('/players'),
      color: 'bg-blue-500',
    },
    {
      title: 'New Session',
      description: 'Start a new match session',
      icon: Play,
      action: () => navigate('/matchmaker'),
      color: 'bg-green-500',
      disabled: availableToday < 16,
    },
    {
      title: 'Register Social Play',
      description: 'Manually enter past match scores',
      icon: Save,
      action: () => navigate('/register-play'),
      color: 'bg-yellow-500',
    },
    {
      title: 'View History',
      description: 'Browse past matches',
      icon: Clock,
      action: () => navigate('/history'),
      color: 'bg-purple-500',
    },
    {
      title: 'Load Sample Data',
      description: 'Load test data for demo',
      icon: Database,
      action: loadSampleData,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Welcome to Padel X Team Maker - Manage your matches and players
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Players</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{state.players.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{availableToday}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {availableToday >= 16 ? 'Ready for matches!' : `Need ${16 - availableToday} more`}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Play className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Live Matches</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{liveMatches}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedMatches}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  disabled={action.disabled}
                  className={`w-full flex items-center p-4 rounded-lg border-2 border-dashed transition-colors duration-200 ${
                    action.disabled
                      ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${action.color} bg-opacity-10`}>
                    <Icon className={`w-5 h-5 text-current`} />
                  </div>
                  <div className="ml-4 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">{action.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Players */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Players</h2>
          {rankedPlayers.length > 0 ? (
            <div className="space-y-3">
              {rankedPlayers.slice(0, 5).map((player, index) => (
                <div key={player.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                      index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900 dark:text-white">{player.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {calculateWinRate(player.stats.matchesWon, player.stats.matchesPlayed)}% win rate
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{player.stats.points}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">points</p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => navigate('/leaderboard')}
                className="w-full mt-4 text-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                View Full Leaderboard →
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No player stats yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Complete some matches to see rankings</p>
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="mt-8">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Backup, restore, or reset your tournament data
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Export Data */}
            <button
              onClick={() => {
                try {
                  const data = exportData();
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `padel-data-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  alert('✅ Data exported successfully!');
                } catch (error) {
                  console.error('Export failed:', error);
                  alert('❌ Failed to export data');
                }
              }}
              className="flex flex-col items-center p-4 border-2 border-dashed border-green-300 dark:border-green-600 rounded-lg hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-200"
            >
              <Download className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
              <span className="font-medium text-gray-900 dark:text-white">Export Data</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 text-center">Download backup</span>
            </button>

            {/* Import Data */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = (e) => {
                    try {
                      const data = e.target?.result as string;
                      if (importData(data)) {
                        alert('✅ Data imported successfully! Refreshing page...');
                        window.location.reload();
                      } else {
                        alert('❌ Failed to import data - invalid format');
                      }
                    } catch (error) {
                      console.error('Import failed:', error);
                      alert('❌ Failed to import data');
                    }
                  };
                  reader.readAsText(file);
                };
                input.click();
              }}
              className="flex flex-col items-center p-4 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
            >
              <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
              <span className="font-medium text-gray-900 dark:text-white">Import Data</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 text-center">Restore from backup</span>
            </button>

            {/* Clear Data */}
            <button
              onClick={() => {
                if (window.confirm('⚠️ Are you sure you want to clear ALL data? This cannot be undone!')) {
                  if (window.confirm('🔴 This will permanently delete all players, matches, and settings. Are you absolutely sure?')) {
                    clearAllData();
                    alert('🗑️ All data cleared! Refreshing page...');
                    window.location.reload();
                  }
                }
              }}
              className="flex flex-col items-center p-4 border-2 border-dashed border-red-300 dark:border-red-600 rounded-lg hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
            >
              <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400 mb-2" />
              <span className="font-medium text-gray-900 dark:text-white">Clear Data</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 text-center">Reset everything</span>
            </button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Data Persistence</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Your data is automatically saved to your browser's local storage. If you're experiencing data loss on refresh,
                  try the troubleshooting steps in the console logs or use the export/import features above.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentMatches.length > 0 && (
        <div className="mt-8">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Matches</h2>
            <div className="space-y-3">
              {recentMatches.map((match, index) => {
                const getPlayerName = (id: string) =>
                  state.players.find(p => p.id === id)?.name || 'Unknown';

                return (
                  <div key={`${match.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Court {match.court}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getPlayerName(match.teamA.player1Id)} + {getPlayerName(match.teamA.player2Id)} vs{' '}
                          {getPlayerName(match.teamB.player1Id)} + {getPlayerName(match.teamB.player2Id)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {match.teamA.gamesWon}-{match.teamB.gamesWon}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {match.winner === 'teamA' ? 'Team A' : 'Team B'} won
                      </p>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => navigate('/history')}
                className="w-full mt-4 text-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                View All History →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
