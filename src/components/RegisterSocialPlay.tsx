import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useAppActions } from '../context/AppContext';
import { Player, Match, Session } from '../types';
import { updatePlayerStats, updateAllPlayersSkillsAfterMatch, rankPlayers } from '../utils/calculations';
import { Save, Users, Trophy, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface MatchEntry {
  id: string;
  teamA: {
    player1Id: string;
    player2Id: string;
  };
  teamB: {
    player1Id: string;
    player2Id: string;
  };
  scoreA: number;
  scoreB: number;
  winner: 'teamA' | 'teamB';
}

interface SessionLeaderboardProps {
  matches: MatchEntry[];
  selectedPlayers: string[];
  players: Player[];
}

function SessionLeaderboard({ matches, selectedPlayers, players }: SessionLeaderboardProps) {
  const sessionRankedPlayers = useMemo(() => {
    // Calculate session stats for leaderboard
    const sessionPlayers = selectedPlayers.map(playerId => {
      const player = players.find(p => p.id === playerId);
      if (!player) return null;

      // Calculate session-specific stats
      let sessionMatchesPlayed = 0;
      let sessionMatchesWon = 0;
      let sessionGamesWon = 0;
      let sessionGamesLost = 0;
      let sessionPoints = 0;

      matches.forEach(match => {
        const isInTeamA = match.teamA.player1Id === playerId || match.teamA.player2Id === playerId;
        const isInTeamB = match.teamB.player1Id === playerId || match.teamB.player2Id === playerId;

        if (isInTeamA || isInTeamB) {
          sessionMatchesPlayed++;
          const isWinner = (isInTeamA && match.winner === 'teamA') || (isInTeamB && match.winner === 'teamB');
          if (isWinner) sessionMatchesWon++;

          const gamesWon = isInTeamA ? match.scoreA : match.scoreB;
          const gamesLost = isInTeamA ? match.scoreB : match.scoreA;
          sessionGamesWon += gamesWon;
          sessionGamesLost += gamesLost;

          // Calculate points using the same logic as calculations.ts
          const points = isWinner ? 10 : (gamesWon === 3 && gamesLost === 4) ? 2 : (gamesWon === 2 && gamesLost === 4) ? 1 : 0;
          sessionPoints += points;
        }
      });

      return {
        ...player,
        stats: {
          ...player.stats,
          matchesPlayed: sessionMatchesPlayed,
          matchesWon: sessionMatchesWon,
          matchesLost: sessionMatchesPlayed - sessionMatchesWon,
          gamesWon: sessionGamesWon,
          gamesLost: sessionGamesLost,
          points: sessionPoints,
        }
      };
    }).filter(Boolean) as Player[];

    return rankPlayers(sessionPlayers);
  }, [matches, selectedPlayers, players]);

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <Trophy className="w-5 h-5 mr-2" />
        Session Leaderboard
      </h2>
      <div className="space-y-3">
        {sessionRankedPlayers.slice(0, 10).map((player, index) => (
          <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{player.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {player.stats.matchesWon}/{player.stats.matchesPlayed} matches • {player.stats.gamesWon}-{player.stats.gamesLost} games
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900 dark:text-white">{player.stats.points}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">points</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RegisterSocialPlay() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { addSession, addMatch } = useAppActions();

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [gamesToWin, setGamesToWin] = useState<number>(state.settings.gamesToWin);
  const [matches, setMatches] = useState<MatchEntry[]>([]);

  // For adding new match
  const [matchPlayers, setMatchPlayers] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);

  const availablePlayers = state.players.filter(p => !p.isGuest);

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleMatchPlayerToggle = (playerId: string) => {
    setMatchPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : prev.length < 4 ? [...prev, playerId] : prev
    );
  };

  const addMatchEntry = () => {
    if (matchPlayers.length === 4 && scoreA >= 0 && scoreB >= 0) {
      const winner = scoreA > scoreB ? 'teamA' : 'teamB';
      const newMatch: MatchEntry = {
        id: `social-${Date.now()}-${matches.length}`,
        teamA: { player1Id: matchPlayers[0], player2Id: matchPlayers[1] },
        teamB: { player1Id: matchPlayers[2], player2Id: matchPlayers[3] },
        scoreA,
        scoreB,
        winner,
      };
      setMatches(prev => [...prev, newMatch]);

      // Reset form
      setMatchPlayers([]);
      setScoreA(0);
      setScoreB(0);
    }
  };

  const removeMatch = (matchId: string) => {
    setMatches(prev => prev.filter(m => m.id !== matchId));
  };

  const submitSession = () => {
    if (selectedPlayers.length < 4 || matches.length === 0) {
      toast.error('Please select at least 4 players and add at least one match');
      return;
    }

    const sessionDate = new Date().toISOString().split('T')[0];
    const sessionId = `social-${Date.now()}`;

    // Create matches
    const matchObjects: Match[] = matches.map(matchEntry => {
      const match: Match = {
        id: matchEntry.id,
        sessionId,
        round: 1,
        court: 'Social',
        status: 'completed',
        teamA: {
          player1Id: matchEntry.teamA.player1Id,
          player2Id: matchEntry.teamA.player2Id,
          gamesWon: matchEntry.scoreA,
        },
        teamB: {
          player1Id: matchEntry.teamB.player1Id,
          player2Id: matchEntry.teamB.player2Id,
          gamesWon: matchEntry.scoreB,
        },
        winner: matchEntry.winner,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        history: [], // No live tracking for social play
      };
      return match;
    });

    // Create session
    const session: Session = {
      id: sessionId,
      date: sessionDate,
      availablePlayers: selectedPlayers,
      matches: matchObjects.map(m => m.id),
      status: 'completed',
      tiers: { strong: [], weak: [] }, // Not used for social play
    };

    // Calculate all player updates using original player data
    const playerUpdates = new Map<string, Player>();

    // First, update stats for all matches using original player data
    matchObjects.forEach(match => {
      // Update stats for team A players
      [match.teamA.player1Id, match.teamA.player2Id].forEach(playerId => {
        const originalPlayer = state.players.find(p => p.id === playerId);
        if (originalPlayer) {
          const updatedPlayer = updatePlayerStats(
            originalPlayer,
            match.teamA.gamesWon,
            match.teamB.gamesWon,
            match.winner === 'teamA',
            sessionDate
          );
          playerUpdates.set(playerId, updatedPlayer);
        }
      });

      // Update stats for team B players
      [match.teamB.player1Id, match.teamB.player2Id].forEach(playerId => {
        const originalPlayer = state.players.find(p => p.id === playerId);
        if (originalPlayer) {
          const updatedPlayer = updatePlayerStats(
            originalPlayer,
            match.teamB.gamesWon,
            match.teamA.gamesWon,
            match.winner === 'teamB',
            sessionDate
          );
          playerUpdates.set(playerId, updatedPlayer);
        }
      });
    });

    // Then, update skills for all matches using the stat-updated players
    matchObjects.forEach(match => {
      const currentPlayers = Array.from(playerUpdates.values());
      const skillUpdatedPlayers = updateAllPlayersSkillsAfterMatch(currentPlayers, match);
      skillUpdatedPlayers.forEach(player => {
        playerUpdates.set(player.id, player);
      });
    });

    // Create final players array
    const finalPlayers = state.players.map(originalPlayer => {
      return playerUpdates.get(originalPlayer.id) || originalPlayer;
    });

    // Save everything with single batch update
    addSession(session);
    matchObjects.forEach(match => addMatch(match));
    dispatch({ type: 'SET_PLAYERS', payload: finalPlayers });

    toast.success('Social play session registered successfully!');
    navigate(`/session-summary/${sessionId}`);
  };

  const getPlayerName = (id: string) => state.players.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Register Social Play</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Record results from spontaneous padel games to update stats and leaderboard
        </p>
      </div>

      <div className="space-y-8">
        {/* Player Selection */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Select Participating Players
          </h2>
          <div className="mb-4">
            <button
              onClick={() => setSelectedPlayers(availablePlayers.map(p => p.id))}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedPlayers([])}
              className="ml-2 px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {availablePlayers.map(player => (
              <label key={player.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(player.id)}
                  onChange={() => handlePlayerToggle(player.id)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-900 dark:text-white">{player.name}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Selected: {selectedPlayers.length} players
          </p>
        </div>

        {/* Game Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Game Settings
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Games to win:</span>
            <label className="flex items-center">
              <input
                type="radio"
                value={6}
                checked={gamesToWin === 6}
                onChange={(e) => setGamesToWin(Number(e.target.value))}
                className="mr-2"
              />
              6 games
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value={4}
                checked={gamesToWin === 4}
                onChange={(e) => setGamesToWin(Number(e.target.value))}
                className="mr-2"
              />
              4 games
            </label>
          </div>
        </div>

        {/* Add Match */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add Match
          </h2>

          {/* Select Players for Match */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select 4 players for this match:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {selectedPlayers.map(playerId => (
                <label key={playerId} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={matchPlayers.includes(playerId)}
                    onChange={() => handleMatchPlayerToggle(playerId)}
                    disabled={matchPlayers.length >= 4 && !matchPlayers.includes(playerId)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{getPlayerName(playerId)}</span>
                </label>
              ))}
            </div>
          </div>

          {matchPlayers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team A */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Team A</h3>
                <div className="space-y-2">
                  <div className="min-h-[24px]">
                    {matchPlayers[0] && <p className="text-sm text-gray-700 dark:text-gray-300">{getPlayerName(matchPlayers[0])}</p>}
                  </div>
                  <div className="min-h-[24px]">
                    {matchPlayers[1] && <p className="text-sm text-gray-700 dark:text-gray-300">{getPlayerName(matchPlayers[1])}</p>}
                  </div>
                  {matchPlayers.length === 4 && (
                    <input
                      type="number"
                      placeholder="Games won"
                      value={scoreA}
                      onChange={(e) => setScoreA(Number(e.target.value))}
                      min="0"
                      max={gamesToWin}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  )}
                </div>
              </div>

              {/* Team B */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Team B</h3>
                <div className="space-y-2">
                  <div className="min-h-[24px]">
                    {matchPlayers[2] && <p className="text-sm text-gray-700 dark:text-gray-300">{getPlayerName(matchPlayers[2])}</p>}
                  </div>
                  <div className="min-h-[24px]">
                    {matchPlayers[3] && <p className="text-sm text-gray-700 dark:text-gray-300">{getPlayerName(matchPlayers[3])}</p>}
                  </div>
                  {matchPlayers.length === 4 && (
                    <input
                      type="number"
                      placeholder="Games won"
                      value={scoreB}
                      onChange={(e) => setScoreB(Number(e.target.value))}
                      min="0"
                      max={gamesToWin}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={addMatchEntry}
            disabled={matchPlayers.length !== 4}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Match
          </button>
        </div>

        {/* Match List */}
        {matches.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Matches ({matches.length})</h2>
            <div className="space-y-3">
              {matches.map(match => (
                <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {getPlayerName(match.teamA.player1Id)} + {getPlayerName(match.teamA.player2Id)} vs {getPlayerName(match.teamB.player1Id)} + {getPlayerName(match.teamB.player2Id)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Score: {match.scoreA}-{match.scoreB} | Winner: {match.winner === 'teamA' ? 'Team A' : 'Team B'}
                    </div>
                  </div>
                  <button
                    onClick={() => removeMatch(match.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session Leaderboard */}
        {matches.length > 0 && <SessionLeaderboard matches={matches} selectedPlayers={selectedPlayers} players={state.players} />}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            onClick={submitSession}
            disabled={matches.length === 0}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Save className="w-5 h-5 mr-2" />
            Finish & View Summary
          </button>
        </div>
      </div>
    </div>
  );
}
