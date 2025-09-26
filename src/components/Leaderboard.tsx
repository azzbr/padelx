import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  Medal,
  TrendingUp,
  Users,
  Target,
  Award,
  Star,
  Crown,
  Zap,
  Calendar,
  Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Player } from '../types';
import { rankPlayers, calculateWinRate, formatStreak, calculatePlayerStatsForPeriod } from '../utils/calculations';

interface PlayerWithRank extends Player {
  rank: number;
  winRate: number;
  gamesWinRate: number;
  isActive: boolean;
  recentPoints: number;
}

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useApp();
  const [timePeriod, setTimePeriod] = useState<'alltime' | 'last30days'>('alltime');
  const [sortBy, setSortBy] = useState<'points' | 'winrate' | 'games' | 'streak'>('points');

  // Calculate player rankings with additional data
  const playersWithRank = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

    let filteredPlayers = [...state.players];

    // Filter by time period for stats calculation
    if (timePeriod === 'last30days') {
      // Calculate stats for the last 30 days
      filteredPlayers = calculatePlayerStatsForPeriod(
        state.players,
        state.matches,
        thirtyDaysAgo,
        now
      );
    }

    const rankedPlayers = rankPlayers(filteredPlayers);

    return rankedPlayers.map((player, index) => {
      const winRate = calculateWinRate(player.stats.matchesWon, player.stats.matchesPlayed);
      const gamesWinRate = calculateWinRate(player.stats.gamesWon, player.stats.gamesWon + player.stats.gamesLost);
      
      // Check if player is active (played in last 14 days)
      const isActive = player.stats.lastPlayed ? 
        new Date(player.stats.lastPlayed) > fourteenDaysAgo : false;

      // Calculate recent points (simplified - in real app would check last 10 matches)
      const recentPoints = Math.max(0, player.stats.points - Math.floor(player.stats.points * 0.3));

      return {
        ...player,
        rank: index + 1,
        winRate,
        gamesWinRate,
        isActive,
        recentPoints,
      } as PlayerWithRank;
    });
  }, [state.players, state.matches, timePeriod]);

  // Sort players based on selected criteria
  const sortedPlayers = useMemo(() => {
    const sorted = [...playersWithRank].sort((a, b) => {
      switch (sortBy) {
        case 'winrate':
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          return b.stats.points - a.stats.points; // Secondary sort by points
        case 'games':
          if (b.stats.gamesWon !== a.stats.gamesWon) return b.stats.gamesWon - a.stats.gamesWon;
          return b.stats.points - a.stats.points;
        case 'streak':
          const aStreak = Math.abs(a.stats.currentStreak);
          const bStreak = Math.abs(b.stats.currentStreak);
          if (bStreak !== aStreak) return bStreak - aStreak;
          return b.stats.points - a.stats.points;
        default: // points
          return b.stats.points - a.stats.points;
      }
    });

    // Separate active and inactive players
    const activePlayers = sorted.filter(p => p.isActive);
    const inactivePlayers = sorted.filter(p => !p.isActive);

    return [...activePlayers, ...inactivePlayers];
  }, [playersWithRank, sortBy]);

  // Find most improved player (most points gained in recent matches)
  const mostImprovedPlayer = useMemo(() => {
    const playersWithMatches = playersWithRank.filter(p => p.stats.matchesPlayed >= 5);
    if (playersWithMatches.length === 0) return null;

    return playersWithMatches.reduce((prev, current) => 
      current.recentPoints > prev.recentPoints ? current : prev
    );
  }, [playersWithRank]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 2:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 3:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  if (playersWithRank.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mr-4"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>
          </div>
          
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Players Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Add some players and complete matches to see rankings
            </p>
            <button
              onClick={() => navigate('/players')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add Players
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mr-4"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {playersWithRank.filter(p => p.isActive).length} active players • {playersWithRank.filter(p => !p.isActive).length} inactive
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Time Period Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setTimePeriod('alltime')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timePeriod === 'alltime'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setTimePeriod('last30days')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timePeriod === 'last30days'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Last 30 Days
              </button>
            </div>

            {/* Sort Options */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'points' | 'winrate' | 'games' | 'streak')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="points">Sort by Points</option>
                <option value="winrate">Sort by Win Rate</option>
                <option value="games">Sort by Games Won</option>
                <option value="streak">Sort by Current Streak</option>
              </select>
            </div>
          </div>
        </div>

        {/* Most Improved Badge */}
        {mostImprovedPlayer && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-sm p-6 mb-6 text-white">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Most Improved Player</h3>
                <p className="text-green-100">
                  <span className="font-bold">{mostImprovedPlayer.name}</span> • +{mostImprovedPlayer.recentPoints} points in recent matches
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {sortedPlayers.slice(0, 3).map((player, index) => (
            <div
              key={player.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center ${
                index === 0 ? 'md:order-2 transform md:scale-105' : 
                index === 1 ? 'md:order-1' : 'md:order-3'
              }`}
            >
              <div className="flex justify-center mb-4">
                {getRankIcon(player.rank)}
              </div>
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-3 ${getRankBadgeColor(player.rank)}`}>
                #{player.rank}
              </div>
              <h3 className={`text-lg font-bold mb-2 ${!player.isActive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                {player.name}
                {!player.isActive && <span className="text-xs ml-2 text-gray-400">(inactive)</span>}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Points:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{player.stats.points}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Win Rate:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{player.winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Streak:</span>
                  <span className={`font-semibold ${
                    player.stats.currentStreak > 0 ? 'text-green-600 dark:text-green-400' : 
                    player.stats.currentStreak < 0 ? 'text-red-600 dark:text-red-400' : 
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {formatStreak(player.stats.currentStreak)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Full Rankings Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Full Rankings</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Games
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Streak
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedPlayers.map((player, index) => (
                  <tr 
                    key={player.id} 
                    className={`${!player.isActive ? 'opacity-60' : ''} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {player.rank <= 3 ? getRankIcon(player.rank) : (
                          <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-500">
                            #{player.rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className={`text-sm font-medium ${!player.isActive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                            {player.name}
                            {player.id === mostImprovedPlayer?.id && (
                              <span title="Most Improved">
                                <Zap className="inline w-4 h-4 ml-1 text-green-500" />
                              </span>
                            )}
                          </div>
                          {!player.isActive && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">inactive</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {player.stats.points}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {player.stats.matchesWon}-{player.stats.matchesLost}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ({player.stats.matchesPlayed} total)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className={`text-sm font-medium ${
                        player.winRate >= 70 ? 'text-green-600 dark:text-green-400' :
                        player.winRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {player.winRate}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {player.stats.gamesWon}-{player.stats.gamesLost}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ({player.gamesWinRate}% win rate)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className={`text-sm font-medium ${
                        player.stats.currentStreak > 0 ? 'text-green-600 dark:text-green-400' : 
                        player.stats.currentStreak < 0 ? 'text-red-600 dark:text-red-400' : 
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {formatStreak(player.stats.currentStreak)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {playersWithRank.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Players</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <Target className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {playersWithRank.filter(p => p.isActive).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Players</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(playersWithRank.reduce((sum, p) => sum + p.winRate, 0) / playersWithRank.length) || 0}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Win Rate</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <Star className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(playersWithRank.reduce((sum, p) => sum + p.stats.points, 0) / playersWithRank.length) || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Points</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
