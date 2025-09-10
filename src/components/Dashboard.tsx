import React from 'react';
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
  TrendingUp
} from 'lucide-react';
import { rankPlayers, getTopPerformers, calculateWinRate } from '../utils/calculations';

interface DashboardProps {
  onViewChange: (view: string) => void;
}

export default function Dashboard({ onViewChange }: DashboardProps) {
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
      action: () => onViewChange('players'),
      color: 'bg-blue-500',
    },
    {
      title: 'New Session',
      description: 'Start a new match session',
      icon: Play,
      action: () => onViewChange('matchmaker'),
      color: 'bg-green-500',
      disabled: availableToday < 16,
    },
    {
      title: 'View History',
      description: 'Browse past matches',
      icon: Clock,
      action: () => onViewChange('history'),
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
                onClick={() => onViewChange('leaderboard')}
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
                onClick={() => onViewChange('history')}
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
