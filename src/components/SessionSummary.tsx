import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { rankPlayers } from '../utils/calculations';
import { Trophy, Share2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';

export default function SessionSummary() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { state } = useApp();

  // Find the session
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">The requested session could not be found.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Find all matches for this session
  const sessionMatches = state.matches.filter(m => session.matches.includes(m.id));

  // Calculate session stats for each player
  const sessionPlayers = session.availablePlayers.map(playerId => {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;

    // Calculate session-specific stats
    let sessionMatchesPlayed = 0;
    let sessionMatchesWon = 0;
    let sessionGamesWon = 0;
    let sessionGamesLost = 0;
    let sessionPoints = 0;

    sessionMatches.forEach(match => {
      const isInTeamA = match.teamA.player1Id === playerId || match.teamA.player2Id === playerId;
      const isInTeamB = match.teamB.player1Id === playerId || match.teamB.player2Id === playerId;

      if (isInTeamA || isInTeamB) {
        sessionMatchesPlayed++;
        const isWinner = (isInTeamA && match.winner === 'teamA') || (isInTeamB && match.winner === 'teamB');
        if (isWinner) sessionMatchesWon++;

        const gamesWon = isInTeamA ? match.teamA.gamesWon : match.teamB.gamesWon;
        const gamesLost = isInTeamA ? match.teamB.gamesWon : match.teamA.gamesWon;
        sessionGamesWon += gamesWon;
        sessionGamesLost += gamesLost;

        // Calculate points using the same logic as calculations.ts
        const points = isWinner ? 10 : (gamesWon === 3 && gamesLost === 4) ? 2 : (gamesWon === 2 && gamesLost === 4) ? 1 : 0;
        sessionPoints += points;
      }
    });

    return {
      ...player,
      sessionStats: {
        matchesPlayed: sessionMatchesPlayed,
        matchesWon: sessionMatchesWon,
        matchesLost: sessionMatchesPlayed - sessionMatchesWon,
        gamesWon: sessionGamesWon,
        gamesLost: sessionGamesLost,
        points: sessionPoints,
      }
    };
  }).filter(Boolean) as any[];

  const sessionRankedPlayers = rankPlayers(sessionPlayers.map(p => ({
    ...p,
    stats: (p as any).sessionStats
  })));

  // Format date for display
  const sessionDate = new Date(session.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Generate WhatsApp share text
  const generateWhatsAppText = () => {
    let text = `🏆 Padel Session Results - ${sessionDate} 🏆\n\n`;

    sessionRankedPlayers.forEach((player, index) => {
      const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      const rankText = index < 3 ? `${rankEmoji} ${index + 1}st` : `${index + 1}th`;
      const stats = player.sessionStats;
      text += `${rankText}: ${player.name} - ${stats.points} pts (${stats.matchesWon}-${stats.matchesLost})\n`;
    });

    text += `\nTotal Matches: ${sessionMatches.length}`;
    return text;
  };

  const copyToWhatsApp = async () => {
    const text = generateWhatsAppText();
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Leaderboard copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getPlayerName = (id: string) => state.players.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Social Play Summary - {sessionDate}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {sessionMatches.length} matches played • {session.availablePlayers.length} players participated
        </p>
      </div>

      <div className="space-y-8">
        {/* Session Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{sessionMatches.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Matches</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{session.availablePlayers.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Players</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {sessionMatches.filter(m => m.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
          </div>
        </div>

        {/* Session Leaderboard */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <Trophy className="w-6 h-6 mr-2" />
              Session Results
            </h2>
            <button
              onClick={copyToWhatsApp}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Copy for WhatsApp
            </button>
          </div>

          <div className="space-y-4">
            {sessionRankedPlayers.map((player, index) => {
              const stats = player.sessionStats;
              return (
                <div key={player.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mr-4 ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                      index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{player.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {stats.matchesWon}-{stats.matchesLost} matches • {stats.gamesWon}-{stats.gamesLost} games
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.points}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">points</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Match Details */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Match Details</h2>
          <div className="space-y-3">
            {sessionMatches.map((match, index) => (
              <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-4">#{index + 1}</span>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {getPlayerName(match.teamA.player1Id)} + {getPlayerName(match.teamA.player2Id)} vs{' '}
                    {getPlayerName(match.teamB.player1Id)} + {getPlayerName(match.teamB.player2Id)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {match.teamA.gamesWon}-{match.teamB.gamesWon}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {match.winner === 'teamA' ? 'Team A' : 'Team B'} won
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
