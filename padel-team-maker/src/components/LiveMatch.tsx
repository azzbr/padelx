import React, { useState, useEffect } from 'react';
import { ArrowLeft, Undo2, Play, Pause, Trophy, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Match, Player, GamePoint } from '../types';
import { toast } from 'react-toastify';

interface LiveMatchProps {
  onViewChange: (view: string) => void;
}

const LiveMatch: React.FC<LiveMatchProps> = ({ onViewChange }) => {
  const { state, dispatch } = useApp();
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [matchTimers, setMatchTimers] = useState<{ [matchId: string]: number }>({});

  useEffect(() => {
    // Get current session's matches
    const currentSession = state.sessions.find(s => s.status === 'active');
    if (!currentSession) {
      onViewChange('matchmaker');
      return;
    }

    const matches = state.matches.filter(m => m.sessionId === currentSession.id);
    setActiveMatches(matches);

    // Initialize timers for live matches
    const timers: { [matchId: string]: number } = {};
    matches.forEach(match => {
      if (match.status === 'live' && match.startTime) {
        const elapsed = Math.floor((Date.now() - new Date(match.startTime).getTime()) / 1000);
        timers[match.id] = elapsed;
      } else {
        timers[match.id] = 0;
      }
    });
    setMatchTimers(timers);
  }, [state.matches, state.sessions, onViewChange]);

  useEffect(() => {
    // Update timers every second for live matches
    const interval = setInterval(() => {
      setMatchTimers(prev => {
        const updated = { ...prev };
        activeMatches.forEach(match => {
          if (match.status === 'live') {
            updated[match.id] = (updated[match.id] || 0) + 1;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMatches]);

  const getPlayerName = (playerId: string): string => {
    const player = state.players.find(p => p.id === playerId);
    return player?.name || 'Unknown Player';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startMatch = (matchId: string) => {
    const updatedMatches = state.matches.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          status: 'live' as const,
          startTime: new Date().toISOString()
        };
      }
      return match;
    });

    dispatch({ type: 'SET_MATCHES', payload: updatedMatches });
    toast.success('Match started!');
  };

  const addScore = (matchId: string, team: 'teamA' | 'teamB') => {
    const match = state.matches.find(m => m.id === matchId);
    if (!match || match.status !== 'live') return;

    const gamePoint: GamePoint = {
      teamAScore: match.teamA.gamesWon,
      teamBScore: match.teamB.gamesWon,
      timestamp: new Date().toISOString(),
      action: team === 'teamA' ? 'teamA_score' : 'teamB_score'
    };

    const updatedMatch = {
      ...match,
      [team]: {
        ...match[team],
        gamesWon: match[team].gamesWon + 1
      },
      history: [...match.history, gamePoint]
    };

    // Check if match is won (first to 4 games)
    if (updatedMatch[team].gamesWon >= 4) {
      updatedMatch.status = 'completed';
      updatedMatch.winner = team;
      updatedMatch.endTime = new Date().toISOString();
      
      // Update player stats
      updatePlayerStats(updatedMatch);
      
      toast.success(`Match completed! ${team === 'teamA' ? 'Team A' : 'Team B'} wins!`);
    }

    const updatedMatches = state.matches.map(m => 
      m.id === matchId ? updatedMatch : m
    );

    dispatch({ type: 'SET_MATCHES', payload: updatedMatches });
  };

  const undoLastAction = (matchId: string) => {
    const match = state.matches.find(m => m.id === matchId);
    if (!match || match.history.length === 0) return;

    const lastAction = match.history[match.history.length - 1];
    const updatedMatch = {
      ...match,
      teamA: {
        ...match.teamA,
        gamesWon: lastAction.teamAScore
      },
      teamB: {
        ...match.teamB,
        gamesWon: lastAction.teamBScore
      },
      history: match.history.slice(0, -1),
      status: 'live' as const,
      winner: undefined,
      endTime: undefined
    };

    const updatedMatches = state.matches.map(m => 
      m.id === matchId ? updatedMatch : m
    );

    dispatch({ type: 'SET_MATCHES', payload: updatedMatches });
    toast.info('Last action undone');
  };

  const updatePlayerStats = (match: Match) => {
    const winningTeam = match.winner === 'teamA' ? match.teamA : match.teamB;
    const losingTeam = match.winner === 'teamA' ? match.teamB : match.teamA;
    
    const updatedPlayers = state.players.map(player => {
      const isWinner = winningTeam.player1Id === player.id || winningTeam.player2Id === player.id;
      const isLoser = losingTeam.player1Id === player.id || losingTeam.player2Id === player.id;
      
      if (isWinner || isLoser) {
        const gamesWon = isWinner ? winningTeam.gamesWon : losingTeam.gamesWon;
        const gamesLost = isWinner ? losingTeam.gamesWon : winningTeam.gamesWon;
        
        // Calculate points based on performance
        let points = 0;
        if (isWinner) {
          points = 10; // Win: +10 points
        } else {
          // Loss points based on closeness
          if (gamesWon === 3) points = 2; // Close loss (3-4): +2 points
          else if (gamesWon === 2) points = 1; // Regular loss (2-4): +1 point
          else points = 0; // Bad loss (0-4 or 1-4): 0 points
        }

        return {
          ...player,
          stats: {
            ...player.stats,
            matchesPlayed: player.stats.matchesPlayed + 1,
            matchesWon: isWinner ? player.stats.matchesWon + 1 : player.stats.matchesWon,
            matchesLost: isLoser ? player.stats.matchesLost + 1 : player.stats.matchesLost,
            gamesWon: player.stats.gamesWon + gamesWon,
            gamesLost: player.stats.gamesLost + gamesLost,
            points: player.stats.points + points,
            lastPlayed: new Date().toISOString(),
            currentStreak: isWinner ? 
              (player.stats.currentStreak >= 0 ? player.stats.currentStreak + 1 : 1) :
              (player.stats.currentStreak <= 0 ? player.stats.currentStreak - 1 : -1)
          }
        };
      }
      return player;
    });

    dispatch({ type: 'SET_PLAYERS', payload: updatedPlayers });
  };

  const finishAllMatches = () => {
    const completedCount = activeMatches.filter(m => m.status === 'completed').length;
    const totalMatches = activeMatches.length;

    if (completedCount < totalMatches) {
      toast.error(`Please complete all matches first (${completedCount}/${totalMatches} completed)`);
      return;
    }

    // Mark session as completed
    const updatedSessions = state.sessions.map(session => {
      if (session.status === 'active') {
        return { ...session, status: 'completed' as const };
      }
      return session;
    });

    dispatch({ type: 'SET_SESSIONS', payload: updatedSessions });
    toast.success('All matches completed! Session finished.');
    onViewChange('history');
  };

  const getTeamBalance = (match: Match): { difference: number; color: string; label: string } => {
    const team1Skill = state.players.find(p => p.id === match.teamA.player1Id)?.skill || 0;
    const team2Skill = state.players.find(p => p.id === match.teamA.player2Id)?.skill || 0;
    const team3Skill = state.players.find(p => p.id === match.teamB.player1Id)?.skill || 0;
    const team4Skill = state.players.find(p => p.id === match.teamB.player2Id)?.skill || 0;

    const teamATotal = team1Skill + team2Skill;
    const teamBTotal = team3Skill + team4Skill;
    const difference = Math.abs(teamATotal - teamBTotal);

    if (difference <= 5) return { difference, color: 'text-green-600', label: 'Perfectly Balanced' };
    if (difference <= 10) return { difference, color: 'text-yellow-600', label: 'Good Match' };
    return { difference, color: 'text-red-600', label: 'Unbalanced' };
  };

  if (activeMatches.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No Active Matches
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Create a new session to start playing matches.
            </p>
            <button
              onClick={() => onViewChange('matchmaker')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create New Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onViewChange('dashboard')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Live Matches
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {activeMatches.filter(m => m.status === 'completed').length} of {activeMatches.length} matches completed
              </p>
            </div>
          </div>
          
          <button
            onClick={finishAllMatches}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Trophy className="w-5 h-5" />
            <span>Finish Session</span>
          </button>
        </div>

        {/* Courts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeMatches.map((match) => {
            const balance = getTeamBalance(match);
            const timer = matchTimers[match.id] || 0;

            return (
              <div
                key={match.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                {/* Court Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                        Court {match.court}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(timer)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${balance.color}`}>
                      {balance.label}
                    </span>
                    {match.status === 'waiting' && (
                      <button
                        onClick={() => startMatch(match.id)}
                        className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
                        title="Start Match"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Teams and Scoring */}
                <div className="space-y-4">
                  {/* Team A */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold text-blue-900 dark:text-blue-100">
                        {getPlayerName(match.teamA.player1Id)} + {getPlayerName(match.teamA.player2Id)}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">Team A</div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {match.teamA.gamesWon}
                      </div>
                      {match.status === 'live' && (
                        <button
                          onClick={() => addScore(match.id, 'teamA')}
                          className="bg-blue-600 text-white w-12 h-12 rounded-lg hover:bg-blue-700 transition-colors text-xl font-bold"
                          disabled={match.status !== 'live'}
                        >
                          +1
                        </button>
                      )}
                    </div>
                  </div>

                  {/* VS Divider */}
                  <div className="text-center text-gray-400 dark:text-gray-500 font-bold">
                    VS
                  </div>

                  {/* Team B */}
                  <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold text-red-900 dark:text-red-100">
                        {getPlayerName(match.teamB.player1Id)} + {getPlayerName(match.teamB.player2Id)}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">Team B</div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                        {match.teamB.gamesWon}
                      </div>
                      {match.status === 'live' && (
                        <button
                          onClick={() => addScore(match.id, 'teamB')}
                          className="bg-red-600 text-white w-12 h-12 rounded-lg hover:bg-red-700 transition-colors text-xl font-bold"
                          disabled={match.status !== 'live'}
                        >
                          +1
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Controls */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    {match.status === 'live' && (
                      <button
                        onClick={() => undoLastAction(match.id)}
                        disabled={match.history.length === 0}
                        className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Undo2 className="w-4 h-4" />
                        <span>Undo</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {match.status === 'completed' && (
                      <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                        <Trophy className="w-5 h-5" />
                        <span className="font-medium">
                          {match.winner === 'teamA' ? 'Team A Wins!' : 'Team B Wins!'}
                        </span>
                      </div>
                    )}
                    
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      match.status === 'waiting' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : match.status === 'live'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {match.status === 'waiting' ? 'Waiting' : 
                       match.status === 'live' ? 'Live' : 'Completed'}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>First to 4 games wins</span>
                    <span>{Math.max(match.teamA.gamesWon, match.teamB.gamesWon)}/4</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(Math.max(match.teamA.gamesWon, match.teamB.gamesWon) / 4) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LiveMatch;
