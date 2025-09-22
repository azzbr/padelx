import React, { useMemo } from 'react';
import { useApp, useAppActions } from '../context/AppContext';
import { Tournament, TournamentMatch, Player, Match, Session, RoundRobinStanding } from '../types';
import { Trophy, Play, CheckCircle, Clock, Users, Target, Plus, Minus, Copy, Share2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { generateId, updateTournamentWithResult, calculateRoundRobinStandings, updateRoundRobinTournamentWithResult } from '../utils/matchmaking';

// Use structuredClone for safe deep copying (widely supported in modern browsers)

export default function TournamentBracket() {
  const { state } = useApp();
  const { updateTournament, addMatch, addSession, setCurrentSession, updatePlayer } = useAppActions();

  const currentTournament = state.currentTournament;
  const players = state.players;


  if (!currentTournament) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Active Tournament
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create a tournament in Match Maker to get started
          </p>
          <button
            onClick={() => window.location.href = '/matchmaker'}
            className="btn btn-primary"
          >
            Go to Match Maker
          </button>
        </div>
    </div>
  );
}

  const playerMap = new Map(players.map(p => [p.id, p]));

  // Memoize expensive calculations
  const roundRobinStandings = useMemo(() => {
    if (currentTournament.type === 'round-robin') {
      return calculateRoundRobinStandings(currentTournament, players);
    }
    return [];
  }, [currentTournament, players]);

  const totalTournamentPoints = useMemo(() => {
    return currentTournament.bracket.reduce((total, round) => {
      return total + round.reduce((roundTotal, match) => {
        if (match.score) {
          return roundTotal + match.score.teamA + match.score.teamB;
        }
        return roundTotal;
      }, 0);
    }, 0);
  }, [currentTournament.bracket]);

  const tournamentStats = useMemo(() => {
    const matches = currentTournament.bracket.flat();
    return {
      completed: matches.filter(m => m.status === 'completed').length,
      inProgress: matches.filter(m => m.status === 'in-progress').length,
      pending: matches.filter(m => m.status === 'pending').length,
    };
  }, [currentTournament.bracket]);

  const getMatchStatus = (match: TournamentMatch) => {
    if (match.status === 'completed') {
      return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900' };
    } else if (match.status === 'in-progress') {
      return { icon: Play, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900' };
    } else {
      return { icon: Clock, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700' };
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = playerMap.get(playerId);
    return player ? player.name : 'Unknown Player';
  };

  const getWinningTeamName = () => {
    // For round-robin tournaments, use standings to determine winner
    if (currentTournament.type === 'round-robin') {
      if (roundRobinStandings.length > 0) {
        const winner = roundRobinStandings[0];

        // For switch-doubles format, winner is an individual player
        if (currentTournament.roundRobinFormat === 'switch-doubles') {
          return winner.teamName; // This is the individual player name
        } else {
          // For fixed teams format, winner is a team
          return winner.teamName; // This is the team name
        }
      }
    }

    // Fallback for single-elimination tournaments (find winner of final match)
    const finalRound = currentTournament.bracket[currentTournament.bracket.length - 1];
    if (!finalRound || finalRound.length === 0) return 'Unknown Team';

    const finalMatch = finalRound[0];
    if (!finalMatch.winner) return 'Unknown Team';

    // Get the winning team
    const winningTeam = finalMatch.winner === 'teamA' ? finalMatch.teamA : finalMatch.teamB;

    // Get player names
    const player1Name = getPlayerName(winningTeam.player1Id);
    const player2Name = getPlayerName(winningTeam.player2Id);

    return `${player1Name} + ${player2Name}`;
  };

  const getTotalTournamentPoints = () => {
    let totalPoints = 0;

    // Sum up all points from completed matches
    currentTournament.bracket.forEach(round => {
      round.forEach(match => {
        if (match.score) {
          totalPoints += match.score.teamA + match.score.teamB;
        }
      });
    });

    return totalPoints;
  };

  // Generate tournament schedule text for copying
  const generateTournamentScheduleText = () => {
    let scheduleText = `🏆 ${currentTournament.name}\n`;
    scheduleText += `📅 ${new Date().toLocaleDateString()}\n\n`;

    if (currentTournament.type === 'round-robin') {
      const formatName = currentTournament.roundRobinFormat === 'switch-doubles' ? 'Rotating Partners' : 'Fixed Teams';
      scheduleText += `🎯 Round-Robin Mode (${formatName})\n\n`;
    } else {
      scheduleText += `🏅 Single Elimination Tournament\n\n`;
    }

    currentTournament.bracket.forEach((round, roundIndex) => {
      scheduleText += `📅 Round ${roundIndex + 1}:\n`;

      round.forEach(match => {
        const courtName = match.court ? `Court ${match.court}` : 'TBD';
        scheduleText += `  ${courtName}: ${match.teamA.name} vs ${match.teamB.name}\n`;

        if (match.status === 'completed' && match.score) {
          const winner = match.winner === 'teamA' ? match.teamA.name : match.teamB.name;
          scheduleText += `    ✅ ${match.score.teamA} - ${match.score.teamB} (${winner} wins)\n`;
        } else if (match.status === 'in-progress' && match.score) {
          scheduleText += `    🔄 ${match.score.teamA} - ${match.score.teamB} (In Progress)\n`;
        } else {
          scheduleText += `    ⏳ Not Started\n`;
        }
      });

      scheduleText += '\n';
    });

    if (currentTournament.type === 'round-robin') {
      const standings = calculateRoundRobinStandings(currentTournament, players);
      if (standings.length > 0) {
        if (currentTournament.roundRobinFormat === 'switch-doubles') {
          scheduleText += `📊 Individual Player Standings:\n`;
          scheduleText += `Rank | Player | P | W | L | T | Pts\n`;
          scheduleText += `-----|--------|---|---|---|---|----\n`;

          standings.forEach(standing => {
            scheduleText += `${standing.rank.toString().padStart(4)} | ${standing.teamName.padEnd(12)} | ${standing.played} | ${standing.won} | ${standing.lost} | ${standing.tied} | ${standing.points}\n`;
          });
        } else {
          scheduleText += `📊 Team Standings:\n`;
          scheduleText += `Rank | Team | P | W | L | T | Pts\n`;
          scheduleText += `-----|------|---|---|---|---|----\n`;

          standings.forEach(standing => {
            scheduleText += `${standing.rank.toString().padStart(4)} | ${standing.teamName.padEnd(12)} | ${standing.played} | ${standing.won} | ${standing.lost} | ${standing.tied} | ${standing.points}\n`;
          });
        }
      }
    }

    scheduleText += `\n🎾 Powered by PadelX`;
    return scheduleText;
  };

  // Copy tournament schedule to clipboard
  const copyTournamentSchedule = async () => {
    const scheduleText = generateTournamentScheduleText();

    try {
      await navigator.clipboard.writeText(scheduleText);
      toast.success('Tournament schedule copied to clipboard! 📋');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = scheduleText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Tournament schedule copied to clipboard! 📋');
    }
  };

  // Share tournament schedule via WhatsApp
  const shareTournamentSchedule = () => {
    const scheduleText = generateTournamentScheduleText();
    const encodedText = encodeURIComponent(scheduleText);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  };

  const handleStartMatch = (match: TournamentMatch) => {
    // Find the match in the tournament bracket
    const roundIndex = currentTournament.bracket.findIndex(round =>
      round.some(m => m.id === match.id)
    );

    if (roundIndex === -1) return;

    const matchIndex = currentTournament.bracket[roundIndex].findIndex(m => m.id === match.id);
    if (matchIndex === -1) return;

    // Update match status to in-progress in tournament
    const updatedTournament = { ...currentTournament };
    updatedTournament.bracket[roundIndex][matchIndex].status = 'in-progress';

    // Initialize scores if not already set
    if (!updatedTournament.bracket[roundIndex][matchIndex].score) {
      updatedTournament.bracket[roundIndex][matchIndex].score = {
        teamA: 0,
        teamB: 0
      };
    }

    // Update tournament
    updateTournament(updatedTournament);

    toast.success('Match started! Use +1 buttons to score.');
  };

  const handleScorePoint = (match: TournamentMatch, team: 'teamA' | 'teamB') => {
    // Find the match in the tournament bracket
    const roundIndex = currentTournament.bracket.findIndex(round =>
      round.some(m => m.id === match.id)
    );

    if (roundIndex === -1) return;

    const matchIndex = currentTournament.bracket[roundIndex].findIndex(m => m.id === match.id);
    if (matchIndex === -1) return;

    // Create a deep copy of the tournament to avoid reference issues
    const updatedTournament = structuredClone(currentTournament);
    const currentMatch = updatedTournament.bracket[roundIndex][matchIndex];

    // Prevent scoring on completed matches
    if (currentMatch.status === 'completed') {
      toast.error('Match is already completed!');
      return;
    }

    // Initialize score if not exists
    if (!currentMatch.score) {
      currentMatch.score = { teamA: 0, teamB: 0 };
    }

    // Check current score before adding point
    const currentScore = currentMatch.score[team];
    const gamesToWin = state.settings.gamesToWin || 6;

    // Prevent scoring beyond win threshold
    if (currentScore >= gamesToWin) {
      toast.error(`Cannot score beyond ${gamesToWin} points!`);
      return;
    }

    // Add point
    currentMatch.score[team] += 1;

    // Check for winner after adding point
    if (currentMatch.score[team] >= gamesToWin) {
      // Set winner and preserve the final score
      currentMatch.winner = team;
      currentMatch.status = 'completed';

      // Save tournament match to match history
      saveTournamentMatchToHistory(currentMatch, currentTournament, roundIndex + 1);

      // Update tournament with winner - use appropriate function based on tournament type
      let tournamentWithWinner;
      if (currentTournament.type === 'round-robin') {
        // For round-robin tournaments, use the specific function that updates standings
        tournamentWithWinner = updateRoundRobinTournamentWithResult(
          updatedTournament, // This has the winner set and final scores preserved
          match.id,
          team,
          currentMatch.score,
          state.players
        );
      } else {
        // For single-elimination tournaments, use the original function
        tournamentWithWinner = updateTournamentWithResult(
          updatedTournament, // This has the winner set and final scores preserved
          match.id,
          team,
          state.players
        );
      }

      updateTournament(tournamentWithWinner);

      toast.success(`${team === 'teamA' ? currentMatch.teamA.name : currentMatch.teamB.name} wins and advances!`);
    } else {
      // Just update the score - use the updated tournament with the new score
      updateTournament(updatedTournament);
    }
  };

  const saveTournamentMatchToHistory = (tournamentMatch: TournamentMatch, tournament: Tournament, round: number) => {
    // Create a regular match record for the tournament match
    const match: Match = {
      id: generateId(), // Use unique ID generator to avoid duplicates
      sessionId: `tournament-${tournament.id}`,
      round: round,
      court: tournamentMatch.court || 'Tournament',
      status: 'completed',
      teamA: {
        player1Id: tournamentMatch.teamA.player1Id,
        player2Id: tournamentMatch.teamA.player2Id,
        gamesWon: tournamentMatch.score?.teamA || 0,
      },
      teamB: {
        player1Id: tournamentMatch.teamB.player1Id,
        player2Id: tournamentMatch.teamB.player2Id,
        gamesWon: tournamentMatch.score?.teamB || 0,
      },
      winner: tournamentMatch.winner,
      history: [], // Tournament matches don't have detailed history
      startTime: new Date().toISOString(), // Use current time as approximation
      endTime: new Date().toISOString(),
    };

    // Add the match to history
    addMatch(match);

    // Update player stats for this tournament match
    updatePlayerStatsForTournamentMatch(match, updatePlayer);
  };

  const updatePlayerStatsForTournamentMatch = (match: Match, updatePlayerFn: (player: Player) => void) => {
    const winningTeam = match.winner === 'teamA' ? match.teamA : match.teamB;
    const losingTeam = match.winner === 'teamA' ? match.teamB : match.teamA;

    // Calculate average skill of opponents for rating adjustment
    const winningTeamSkill = (playerMap.get(winningTeam.player1Id)?.skill || 50) + (playerMap.get(winningTeam.player2Id)?.skill || 50);
    const losingTeamSkill = (playerMap.get(losingTeam.player1Id)?.skill || 50) + (playerMap.get(losingTeam.player2Id)?.skill || 50);
    const avgOpponentSkill = (winningTeamSkill + losingTeamSkill) / 2;

    const updatedPlayers = state.players.map(player => {
      const isWinner = winningTeam.player1Id === player.id || winningTeam.player2Id === player.id;
      const isLoser = losingTeam.player1Id === player.id || losingTeam.player2Id === player.id;

      if (isWinner || isLoser) {
        const gamesWon = isWinner ? winningTeam.gamesWon : losingTeam.gamesWon;
        const gamesLost = isWinner ? losingTeam.gamesWon : winningTeam.gamesWon;

        // Calculate points based on performance (tournament matches give bonus points)
        let points = 0;
        if (isWinner) {
          points = 15; // Tournament win: +15 points (bonus over regular matches)
        } else {
          // Loss points based on closeness
          if (gamesWon === 3) points = 3; // Close loss (3-4): +3 points
          else if (gamesWon === 2) points = 2; // Regular loss (2-4): +2 point
          else points = 1; // Bad loss (0-4 or 1-4): +1 point
        }

        // Calculate skill adjustment based on win/loss and opponent strength
        let skillAdjustment = 0;
        if (isWinner) {
          // Winning against stronger opponents gives more skill points
          const skillDiff = avgOpponentSkill - player.skill;
          skillAdjustment = Math.max(1, Math.min(3, 1 + Math.floor(skillDiff / 20))); // 1-3 points
        } else {
          // Losing to weaker opponents loses fewer skill points
          const skillDiff = player.skill - avgOpponentSkill;
          skillAdjustment = Math.max(-3, Math.min(-1, -1 - Math.floor(skillDiff / 20))); // -1 to -3 points
        }

        // Apply skill bounds (0-100)
        const newSkill = Math.max(0, Math.min(100, player.skill + skillAdjustment));

        return {
          ...player,
          skill: newSkill,
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

    // Update players in state using the passed function
    updatedPlayers.forEach(player => {
      if (player.id) {
        updatePlayerFn(player);
      }
    });
  };

  const handleUndoPoint = (match: TournamentMatch, team: 'teamA' | 'teamB') => {
    // Find the match in the tournament bracket
    const roundIndex = currentTournament.bracket.findIndex(round =>
      round.some(m => m.id === match.id)
    );

    if (roundIndex === -1) return;

    const matchIndex = currentTournament.bracket[roundIndex].findIndex(m => m.id === match.id);
    if (matchIndex === -1) return;

    // Create a deep copy of the tournament to avoid reference issues
    const updatedTournament = structuredClone(currentTournament);
    const currentMatch = updatedTournament.bracket[roundIndex][matchIndex];

    // Initialize score if not exists
    if (!currentMatch.score) {
      currentMatch.score = { teamA: 0, teamB: 0 };
    }

    // Remove point (minimum 0)
    if (currentMatch.score[team] > 0) {
      currentMatch.score[team] -= 1;

      // If match was completed, reset it
      if (currentMatch.status === 'completed') {
        currentMatch.status = 'in-progress';
        currentMatch.winner = undefined;
      }

      updateTournament(updatedTournament);
    }
  };


  const renderMatch = (match: TournamentMatch, roundIndex: number, matchIndex: number) => {
    const status = getMatchStatus(match);
    const StatusIcon = status.icon;

    return (
      <div
        key={match.id}
        className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
          match.status === 'completed'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
            : match.status === 'in-progress'
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600'
        }`}
      >
        {/* Match Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Round {match.round} - Match {match.matchNumber}
            </span>
          </div>
          {match.court && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {match.court}
            </span>
          )}
        </div>

        {/* Teams with Scoring */}
        <div className="space-y-3">
          {/* Team A */}
          <div className={`p-3 rounded border ${
            match.winner === 'teamA'
              ? 'bg-green-100 dark:bg-green-800 border-green-300 dark:border-green-600'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">
                  {match.teamA.name}
                </span>
              </div>
              {match.winner === 'teamA' && (
                <Trophy className="w-4 h-4 text-yellow-500" />
              )}
            </div>

            {/* Scoring Controls for Team A */}
            {match.status === 'in-progress' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleUndoPoint(match, 'teamA')}
                    disabled={!match.score || match.score.teamA <= 0}
                    className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400 min-w-[2rem] text-center">
                    {match.score?.teamA || 0}
                  </span>
                  <button
                    onClick={() => handleScorePoint(match, 'teamA')}
                    className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-xs text-gray-500">Team A</span>
              </div>
            )}

            {/* Score Display for Completed/Pending */}
            {match.status !== 'in-progress' && match.score && (
              <div className="text-center">
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {match.score.teamA}
                </span>
              </div>
            )}
          </div>

          {/* VS with Score */}
          <div className="text-center py-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">VS</div>
            {match.status === 'in-progress' && match.score && (
              <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {match.score.teamA} - {match.score.teamB}
              </div>
            )}
          </div>

          {/* Team B */}
          <div className={`p-3 rounded border ${
            match.winner === 'teamB'
              ? 'bg-green-100 dark:bg-green-800 border-green-300 dark:border-green-600'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">
                  {match.teamB.name}
                </span>
              </div>
              {match.winner === 'teamB' && (
                <Trophy className="w-4 h-4 text-yellow-500" />
              )}
            </div>

            {/* Scoring Controls for Team B */}
            {match.status === 'in-progress' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleUndoPoint(match, 'teamB')}
                    disabled={!match.score || match.score.teamB <= 0}
                    className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400 min-w-[2rem] text-center">
                    {match.score?.teamB || 0}
                  </span>
                  <button
                    onClick={() => handleScorePoint(match, 'teamB')}
                    className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-xs text-gray-500">Team B</span>
              </div>
            )}

            {/* Score Display for Completed/Pending */}
            {match.status !== 'in-progress' && match.score && (
              <div className="text-center">
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  {match.score.teamB}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {match.status === 'pending' && (
          <button
            onClick={() => handleStartMatch(match)}
            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>Start Match</span>
          </button>
        )}

        {match.status === 'in-progress' && (
          <div className="mt-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              Use +1 buttons above to score • First to {state.settings.gamesToWin || 6} wins
            </div>
          </div>
        )}

        {match.status === 'completed' && (
          <div className="mt-3 text-center">
            <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-3 py-2 rounded-lg font-medium">
              ✅ Match Complete • Winner Advances
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tournament Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <span>{currentTournament.name}</span>
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {currentTournament.type === 'round-robin' ? 'Round-Robin Mode' :
               currentTournament.type === 'single-elimination' ? 'Single Elimination' : 'Tournament'} •
              {currentTournament.status === 'completed'
                ? `Completed • ${currentTournament.totalRounds} Rounds Played`
                : `Round ${currentTournament.currentRound} of ${currentTournament.totalRounds} • Active`
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={copyTournamentSchedule}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Schedule</span>
            </button>
            <button
              onClick={shareTournamentSchedule}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Round-Robin Standings (only for round-robin tournaments) */}
      {currentTournament.type === 'round-robin' && (
        <div className="card p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span>Current Standings</span>
            {currentTournament.roundRobinFormat === 'switch-doubles' && (
              <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded ml-2">
                Individual Rankings
              </span>
            )}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Rank</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    {currentTournament.roundRobinFormat === 'switch-doubles' ? 'Player' : 'Team'}
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">P</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">W</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">L</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">T</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">Pts</th>
                  {currentTournament.roundRobinFormat !== 'switch-doubles' && (
                    <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">Diff</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {roundRobinStandings.map((standing, index) => (
                    <tr key={standing.teamId} className={`border-b border-gray-100 dark:border-gray-700 ${
                      standing.rank === 1 ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                      standing.rank === 2 ? 'bg-gray-50 dark:bg-gray-800/50' :
                      standing.rank === 3 ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                    }`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {standing.rank === 1 && <Trophy className="w-4 h-4 text-yellow-500" />}
                          {standing.rank === 2 && <span className="text-lg">🥈</span>}
                          {standing.rank === 3 && <span className="text-lg">🥉</span>}
                          <span className={`font-bold ${
                            standing.rank === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                            standing.rank === 2 ? 'text-gray-600 dark:text-gray-400' :
                            standing.rank === 3 ? 'text-orange-600 dark:text-orange-400' :
                            'text-gray-900 dark:text-white'
                          }`}>
                            {standing.rank}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {standing.teamName}
                      </td>
                      <td className="text-center py-3 px-4 text-gray-600 dark:text-gray-400">
                        {standing.played}
                      </td>
                      <td className="text-center py-3 px-4 text-green-600 dark:text-green-400 font-medium">
                        {standing.won}
                      </td>
                      <td className="text-center py-3 px-4 text-red-600 dark:text-red-400 font-medium">
                        {standing.lost}
                      </td>
                      <td className="text-center py-3 px-4 text-blue-600 dark:text-blue-400 font-medium">
                        {standing.tied}
                      </td>
                      <td className="text-center py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        {standing.points}
                      </td>
                      {currentTournament.roundRobinFormat !== 'switch-doubles' && (
                        <td className={`text-center py-3 px-4 font-medium ${
                          standing.pointsDifference > 0 ? 'text-green-600 dark:text-green-400' :
                          standing.pointsDifference < 0 ? 'text-red-600 dark:text-red-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {standing.pointsDifference > 0 ? '+' : ''}{standing.pointsDifference}
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Scoring:</strong> Win = 3 points, Tie = 1 point, Loss = 0 points</p>
            <p><strong>Tie-breakers:</strong> Points → Points Difference → Points For</p>
          </div>
        </div>
      )}

      {/* Tournament Bracket */}
      <div className="space-y-8">
        {currentTournament.bracket.map((round, roundIndex) => (
          <div key={roundIndex} className="card p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Round {roundIndex + 1}
              {roundIndex + 1 === currentTournament.currentRound && (
                <span className="ml-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                  Current Round
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {round.map((match, matchIndex) => renderMatch(match, roundIndex, matchIndex))}
            </div>
          </div>
        ))}
      </div>

      {/* Tournament Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {currentTournament.bracket.flat().filter(m => m.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Matches Completed</div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
            {currentTournament.bracket.flat().filter(m => m.status === 'in-progress').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Matches In Progress</div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-2">
            {currentTournament.bracket.flat().filter(m => m.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Matches Remaining</div>
        </div>
      </div>

      {/* Enhanced Tournament Winner Display - Moved to End */}
      {currentTournament.status === 'completed' && currentTournament.winner && (
        <div className="mt-12 flex justify-center">
          <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white p-8 rounded-2xl shadow-2xl border-4 border-yellow-300 max-w-2xl w-full">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-yellow-200 mr-3 animate-bounce" />
              <span className="text-2xl font-bold">🏆 TOURNAMENT CHAMPION 🏆</span>
              <Trophy className="w-10 h-10 text-yellow-200 ml-3 animate-bounce" />
            </div>

            <div className="mb-6 text-center">
              <h3 className="text-xl font-semibold text-yellow-100 mb-2">Tournament Completed</h3>
              <p className="text-sm text-yellow-200">{new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-6">
              <div className="text-sm font-medium text-yellow-100 mb-3 text-center">
                🥇 {currentTournament.type === 'round-robin' && currentTournament.roundRobinFormat === 'switch-doubles' ? 'WINNING PLAYER' : 'WINNING TEAM'}
              </div>
              <div className="text-3xl font-bold text-white mb-3 text-center">{getWinningTeamName()}</div>
              <div className="text-sm text-yellow-200 text-center">
                {currentTournament.type === 'round-robin' && currentTournament.roundRobinFormat === 'switch-doubles' ? 'Tournament Champion' : 'Champions'} of {currentTournament.name}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 text-center mb-6">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-white mb-1">{currentTournament.bracket.flat().length}</div>
                <div className="text-xs text-yellow-200">Total Matches</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-white mb-1">{currentTournament.totalRounds}</div>
                <div className="text-xs text-yellow-200">Rounds Played</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-white mb-1">{getTotalTournamentPoints()}</div>
                <div className="text-xs text-yellow-200">Points Scored</div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-lg text-yellow-200 font-medium">🎊 Congratulations! 🎊</div>
              <div className="text-sm text-yellow-300 mt-2">Tournament successfully completed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
