import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Trophy,
  Users,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  BarChart3,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Match } from '../types';

const LiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useApp();

  // Get all active sessions and tournaments
  const activeItems = useMemo(() => {
    const activeSessions = state.sessions.filter(s => s.status === 'active');
    const activeTournaments = state.tournaments.filter(t => t.status === 'active');

    return [
      ...activeSessions.map(session => ({
        id: session.id,
        type: 'session' as const,
        name: `Session ${new Date(session.date).toLocaleDateString()}`,
        description: `${session.availablePlayers.length} players available`,
        status: 'active' as const,
        matches: state.matches.filter(m => m.sessionId === session.id),
        createdAt: session.date,
        format: 'Session' as const
      })),
      ...activeTournaments.map(tournament => ({
        id: tournament.id,
        type: 'tournament' as const,
        name: tournament.name,
        description: `${tournament.type === 'round-robin' ? 'Round-Robin' : 'Single Elimination'} • ${tournament.currentRound}/${tournament.totalRounds} rounds`,
        status: 'active' as const,
        matches: tournament.bracket.flat(),
        createdAt: tournament.createdAt || new Date().toISOString(),
        format: tournament.type === 'round-robin' && tournament.roundRobinFormat ?
          `${tournament.roundRobinFormat.replace('-', ' ')}` :
          tournament.type
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.sessions, state.tournaments, state.matches]);

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    const totalActiveItems = activeItems.length;
    const totalLiveMatches = activeItems.reduce((sum, item) =>
      sum + item.matches.filter(m => m.status === 'live').length, 0);
    const totalCompletedMatches = activeItems.reduce((sum, item) =>
      sum + item.matches.filter(m => m.status === 'completed').length, 0);
    const totalPlayersInvolved = new Set(
      activeItems.flatMap(item =>
        item.matches.flatMap(m => [
          m.teamA.player1Id, m.teamA.player2Id,
          m.teamB.player1Id, m.teamB.player2Id
        ])
      )
    ).size;

    return {
      totalActiveItems,
      totalLiveMatches,
      totalCompletedMatches,
      totalPlayersInvolved
    };
  }, [activeItems]);

  const getItemStats = (item: typeof activeItems[0]) => {
    const liveMatches = item.matches.filter(m => m.status === 'live').length;
    const completedMatches = item.matches.filter(m => m.status === 'completed').length;
    const totalMatches = item.matches.length;
    const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

    return {
      liveMatches,
      completedMatches,
      totalMatches,
      progress,
      timeElapsed: item.matches
        .filter(m => 'startTime' in m && m.startTime)
        .reduce((total, m) => {
          const match = m as Match; // Type assertion for matches with startTime
          const start = new Date(match.startTime!).getTime();
          const end = match.endTime ? new Date(match.endTime).getTime() : Date.now();
          return total + (end - start);
        }, 0)
    };
  };

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getItemIcon = (type: string, format: string) => {
    if (type === 'tournament') {
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    }
    switch (format.toLowerCase()) {
      case 'mixed tiers':
        return <BarChart3 className="w-5 h-5 text-purple-500" />;
      case 'round robin':
        return <Target className="w-5 h-5 text-blue-500" />;
      case 'social play':
        return <Users className="w-5 h-5 text-green-500" />;
      default:
        return <Play className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getItemColor = (type: string, format: string) => {
    if (type === 'tournament') {
      return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20';
    }
    switch (format.toLowerCase()) {
      case 'mixed tiers':
        return 'border-purple-200 bg-purple-50 dark:bg-purple-900/20';
      case 'round robin':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
      case 'social play':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20';
    }
  };

  if (activeItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Live Dashboard
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                No active sessions or tournaments
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Start Your First Session
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Create a new session or tournament to begin tracking live matches
                </p>
              </div>

              <button
                onClick={() => navigate('/matchmaker')}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2 font-medium"
              >
                <Play className="w-5 h-5" />
                <span>Create New Session</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Live Dashboard
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Track and manage all your active sessions and tournaments
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <Play className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Sessions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardStats.totalActiveItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Live Matches</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardStats.totalLiveMatches}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Matches</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardStats.totalCompletedMatches}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Players Active</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardStats.totalPlayersInvolved}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Items Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeItems.map((item) => {
            const stats = getItemStats(item);
            const icon = getItemIcon(item.type, item.format);
            const colorClass = getItemColor(item.type, item.format);

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 ${colorClass} hover:shadow-xl transition-all duration-200 cursor-pointer`}
                onClick={() => navigate(item.type === 'session' ? `/live/session/${item.id}` : `/live/tournament/${item.id}`)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                      {icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
                      ACTIVE
                    </span>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.liveMatches}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Live</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.completedMatches}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.totalMatches}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{stats.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.progress}%` }}
                    />
                  </div>
                </div>

                {/* Time and Format */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(stats.timeElapsed)}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="capitalize">{item.format}</span>
                  </div>
                </div>

                {/* Action Hint */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                    Click to score matches →
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/matchmaker')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>New Session</span>
            </button>

            <button
              onClick={() => navigate('/history')}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 font-medium"
            >
              <Trophy className="w-5 h-5" />
              <span>View History</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDashboard;
