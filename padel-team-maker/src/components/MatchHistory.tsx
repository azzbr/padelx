import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Download, 
  Copy, 
  ChevronDown, 
  ChevronRight,
  Calendar,
  Clock,
  Trophy,
  Users,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Session, Match, Player } from '../types';
import { generateMatchSummary } from '../utils/calculations';
import { toast } from 'react-toastify';

interface MatchHistoryProps {
  onViewChange: (view: string) => void;
}

interface SessionWithMatches extends Session {
  sessionMatches: Match[];
  duration?: string;
  averageScore?: string;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ onViewChange }) => {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Process sessions with their matches
  const sessionsWithMatches = useMemo(() => {
    const completedSessions = state.sessions
      .filter(session => session.status === 'completed')
      .map(session => {
        const sessionMatches = state.matches.filter(
          match => match.sessionId === session.id && match.status === 'completed'
        );

        // Calculate session duration
        let duration = '';
        if (sessionMatches.length > 0) {
          const startTimes = sessionMatches
            .filter(m => m.startTime)
            .map(m => new Date(m.startTime!).getTime());
          const endTimes = sessionMatches
            .filter(m => m.endTime)
            .map(m => new Date(m.endTime!).getTime());

          if (startTimes.length > 0 && endTimes.length > 0) {
            const sessionStart = Math.min(...startTimes);
            const sessionEnd = Math.max(...endTimes);
            const durationMs = sessionEnd - sessionStart;
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            duration = `${hours}h ${minutes}m`;
          }
        }

        // Calculate average score
        let averageScore = '';
        if (sessionMatches.length > 0) {
          const totalWinnerGames = sessionMatches.reduce((sum, match) => {
            return sum + Math.max(match.teamA.gamesWon, match.teamB.gamesWon);
          }, 0);
          const totalLoserGames = sessionMatches.reduce((sum, match) => {
            return sum + Math.min(match.teamA.gamesWon, match.teamB.gamesWon);
          }, 0);
          const avgWinner = Math.round(totalWinnerGames / sessionMatches.length);
          const avgLoser = Math.round(totalLoserGames / sessionMatches.length);
          averageScore = `${avgWinner}-${avgLoser}`;
        }

        return {
          ...session,
          sessionMatches,
          duration,
          averageScore,
        } as SessionWithMatches;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply date filter
    const now = new Date();
    const filteredSessions = completedSessions.filter(session => {
      const sessionDate = new Date(session.date);
      switch (dateFilter) {
        case '7days':
          return (now.getTime() - sessionDate.getTime()) <= (7 * 24 * 60 * 60 * 1000);
        case '30days':
          return (now.getTime() - sessionDate.getTime()) <= (30 * 24 * 60 * 60 * 1000);
        default:
          return true;
      }
    });

    // Apply search filter
    if (searchTerm.trim()) {
      return filteredSessions.filter(session => {
        return session.sessionMatches.some(match => {
          const playerIds = [
            match.teamA.player1Id,
            match.teamA.player2Id,
            match.teamB.player1Id,
            match.teamB.player2Id,
          ];
          return playerIds.some(playerId => {
            const player = state.players.find(p => p.id === playerId);
            return player?.name.toLowerCase().includes(searchTerm.toLowerCase());
          });
        });
      });
    }

    return filteredSessions;
  }, [state.sessions, state.matches, state.players, searchTerm, dateFilter]);

  const getPlayerName = (playerId: string): string => {
    const player = state.players.find(p => p.id === playerId);
    return player?.name || 'Unknown Player';
  };

  const highlightSearchTerm = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </span>
      ) : part
    );
  };

  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const formatMatchResult = (match: Match): string => {
    const teamAPlayer1 = getPlayerName(match.teamA.player1Id);
    const teamAPlayer2 = getPlayerName(match.teamA.player2Id);
    const teamBPlayer1 = getPlayerName(match.teamB.player1Id);
    const teamBPlayer2 = getPlayerName(match.teamB.player2Id);

    if (match.winner === 'teamA') {
      return `Court ${match.court}: ${teamAPlayer1} + ${teamAPlayer2} (WINNER ${match.teamA.gamesWon}) vs ${teamBPlayer1} + ${teamBPlayer2} (LOSER ${match.teamB.gamesWon})`;
    } else {
      return `Court ${match.court}: ${teamAPlayer1} + ${teamAPlayer2} (LOSER ${match.teamA.gamesWon}) vs ${teamBPlayer1} + ${teamBPlayer2} (WINNER ${match.teamB.gamesWon})`;
    }
  };

  const copyToClipboard = async (session: SessionWithMatches) => {
    const sessionText = generateSessionText(session);
    try {
      await navigator.clipboard.writeText(sessionText);
      toast.success('Session results copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadSession = (session: SessionWithMatches) => {
    const sessionText = generateSessionText(session);
    const blob = new Blob([sessionText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `padel-history-${session.date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Session results downloaded!');
  };

  const generateSessionText = (session: SessionWithMatches): string => {
    const sessionDate = new Date(session.date).toLocaleDateString();
    let text = `Padel Session - ${sessionDate}\n`;
    text += `Total Matches: ${session.sessionMatches.length}`;
    if (session.averageScore) text += ` | Average Score: ${session.averageScore}`;
    if (session.duration) text += ` | Duration: ${session.duration}`;
    text += '\n\n';

    session.sessionMatches.forEach((match, index) => {
      text += `${index + 1}. ${formatMatchResult(match)}\n`;
    });

    return text;
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Match history refreshed!');
  };

  if (sessionsWithMatches.length === 0 && !searchTerm && dateFilter === 'all') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center mb-8">
            <button
              onClick={() => onViewChange('dashboard')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mr-4"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Match History</h1>
          </div>
          
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Match History Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Complete some matches to see your history here
            </p>
            <button
              onClick={() => onViewChange('matchmaker')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Start New Session
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
              onClick={() => onViewChange('dashboard')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mr-4"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Match History</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {sessionsWithMatches.length} session{sessionsWithMatches.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by player name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as 'all' | '7days' | '30days')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {sessionsWithMatches.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No matches found for "{searchTerm}"
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mt-2"
              >
                Clear search
              </button>
            </div>
          ) : (
            sessionsWithMatches.map((session) => {
              const isExpanded = expandedSessions.has(session.id);
              const sessionDate = new Date(session.date).toLocaleDateString();

              return (
                <div
                  key={session.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
                >
                  {/* Session Header */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => toggleSessionExpansion(session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                          <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {sessionDate}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <Trophy className="w-4 h-4" />
                              <span>Total Matches: {session.sessionMatches.length}</span>
                            </span>
                            {session.averageScore && (
                              <span>Average Score: {session.averageScore}</span>
                            )}
                            {session.duration && (
                              <span className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>Duration: {session.duration}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(session);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadSession(session);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Download as text file"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Session Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700">
                      <div className="space-y-3">
                        {session.sessionMatches.map((match, index) => (
                          <div
                            key={match.id}
                            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {highlightSearchTerm(formatMatchResult(match), searchTerm)}
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {match.startTime && match.endTime && (
                                  <span className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      Duration: {Math.round(
                                        (new Date(match.endTime).getTime() - new Date(match.startTime).getTime()) / (1000 * 60)
                                      )}m
                                    </span>
                                  </span>
                                )}
                                <span>
                                  Final Score: {match.teamA.gamesWon}-{match.teamB.gamesWon}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                match.winner === 'teamA' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {match.winner === 'teamA' ? 'Team A Won' : 'Team B Won'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchHistory;
