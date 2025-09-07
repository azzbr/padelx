import { Player, Match } from '../types';

// Point system constants
const POINTS = {
  WIN: 10,
  CLOSE_LOSS: 2, // Lost 3-4
  REGULAR_LOSS: 1, // Lost 2-4
  BAD_LOSS: 0, // Lost 0-4 or 1-4
} as const;

// Calculate points for a match result
export function calculateMatchPoints(gamesWon: number, gamesLost: number, isWinner: boolean): number {
  if (isWinner) {
    return POINTS.WIN;
  }
  
  // Loss scenarios
  if (gamesWon === 3 && gamesLost === 4) {
    return POINTS.CLOSE_LOSS;
  } else if (gamesWon === 2 && gamesLost === 4) {
    return POINTS.REGULAR_LOSS;
  } else {
    return POINTS.BAD_LOSS; // 0-4 or 1-4 loss
  }
}

// Update player statistics after a match
export function updatePlayerStats(
  player: Player,
  gamesWon: number,
  gamesLost: number,
  isWinner: boolean,
  matchDate: string
): Player {
  const points = calculateMatchPoints(gamesWon, gamesLost, isWinner);
  
  const updatedStats = {
    ...player.stats,
    matchesPlayed: player.stats.matchesPlayed + 1,
    matchesWon: isWinner ? player.stats.matchesWon + 1 : player.stats.matchesWon,
    matchesLost: isWinner ? player.stats.matchesLost : player.stats.matchesLost + 1,
    gamesWon: player.stats.gamesWon + gamesWon,
    gamesLost: player.stats.gamesLost + gamesLost,
    points: player.stats.points + points,
    lastPlayed: matchDate,
  };
  
  // Update current streak
  if (isWinner) {
    updatedStats.currentStreak = player.stats.currentStreak >= 0 
      ? player.stats.currentStreak + 1 
      : 1;
  } else {
    updatedStats.currentStreak = player.stats.currentStreak <= 0 
      ? player.stats.currentStreak - 1 
      : -1;
  }
  
  return {
    ...player,
    stats: updatedStats,
  };
}

// Calculate win rate percentage
export function calculateWinRate(matchesWon: number, matchesPlayed: number): number {
  if (matchesPlayed === 0) return 0;
  return Math.round((matchesWon / matchesPlayed) * 100);
}

// Calculate games win rate percentage
export function calculateGamesWinRate(gamesWon: number, totalGames: number): number {
  if (totalGames === 0) return 0;
  return Math.round((gamesWon / totalGames) * 100);
}

// Get player ranking based on points
export function rankPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    // Primary sort: Points (descending)
    if (b.stats.points !== a.stats.points) {
      return b.stats.points - a.stats.points;
    }
    
    // Secondary sort: Win rate (descending)
    const aWinRate = calculateWinRate(a.stats.matchesWon, a.stats.matchesPlayed);
    const bWinRate = calculateWinRate(b.stats.matchesWon, b.stats.matchesPlayed);
    if (bWinRate !== aWinRate) {
      return bWinRate - aWinRate;
    }
    
    // Tertiary sort: Games won (descending)
    if (b.stats.gamesWon !== a.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }
    
    // Final sort: Alphabetical by name
    return a.name.localeCompare(b.name);
  });
}

// Get top performers
export function getTopPerformers(players: Player[]): {
  topScorer: Player | null;
  bestWinRate: Player | null;
  longestStreak: Player | null;
  mostImproved: Player | null;
} {
  if (players.length === 0) {
    return {
      topScorer: null,
      bestWinRate: null,
      longestStreak: null,
      mostImproved: null,
    };
  }
  
  const playersWithMatches = players.filter(p => p.stats.matchesPlayed > 0);
  
  const topScorer = playersWithMatches.reduce((prev, current) => 
    current.stats.points > prev.stats.points ? current : prev
  , playersWithMatches[0] || null);
  
  const bestWinRate = playersWithMatches
    .filter(p => p.stats.matchesPlayed >= 3) // Minimum 3 matches for meaningful win rate
    .reduce((prev, current) => {
      const prevRate = calculateWinRate(prev.stats.matchesWon, prev.stats.matchesPlayed);
      const currentRate = calculateWinRate(current.stats.matchesWon, current.stats.matchesPlayed);
      return currentRate > prevRate ? current : prev;
    }, playersWithMatches[0] || null);
  
  const longestStreak = playersWithMatches.reduce((prev, current) => 
    Math.abs(current.stats.currentStreak) > Math.abs(prev.stats.currentStreak) ? current : prev
  , playersWithMatches[0] || null);
  
  // Most improved is a placeholder - in a real app, this would compare skill ratings over time
  const mostImproved = playersWithMatches.reduce((prev, current) => 
    current.stats.points > prev.stats.points ? current : prev
  , playersWithMatches[0] || null);
  
  return {
    topScorer,
    bestWinRate,
    longestStreak,
    mostImproved,
  };
}

// Calculate team chemistry score (for future partnership recommendations)
export function calculateTeamChemistry(player1: Player, player2: Player, matches: Match[]): number {
  // Find matches where these players were teammates
  const partnershipMatches = matches.filter(match => {
    const teamAPlayers = [match.teamA.player1Id, match.teamA.player2Id];
    const teamBPlayers = [match.teamB.player1Id, match.teamB.player2Id];
    
    return (teamAPlayers.includes(player1.id) && teamAPlayers.includes(player2.id)) ||
           (teamBPlayers.includes(player1.id) && teamBPlayers.includes(player2.id));
  });
  
  if (partnershipMatches.length === 0) return 0;
  
  const wins = partnershipMatches.filter(match => {
    const teamAPlayers = [match.teamA.player1Id, match.teamA.player2Id];
    const isTeamA = teamAPlayers.includes(player1.id);
    return (isTeamA && match.winner === 'teamA') || (!isTeamA && match.winner === 'teamB');
  }).length;
  
  return Math.round((wins / partnershipMatches.length) * 100);
}

// Generate match summary text
export function generateMatchSummary(match: Match, players: Player[]): string {
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';
  
  const teamAPlayer1 = getPlayerName(match.teamA.player1Id);
  const teamAPlayer2 = getPlayerName(match.teamA.player2Id);
  const teamBPlayer1 = getPlayerName(match.teamB.player1Id);
  const teamBPlayer2 = getPlayerName(match.teamB.player2Id);
  
  const teamAScore = match.teamA.gamesWon;
  const teamBScore = match.teamB.gamesWon;
  
  if (match.status === 'completed') {
    const winnerScore = Math.max(teamAScore, teamBScore);
    const loserScore = Math.min(teamAScore, teamBScore);
    
    if (match.winner === 'teamA') {
      return `Court ${match.court}: ${teamAPlayer1} + ${teamAPlayer2} (WIN ${winnerScore}) vs ${teamBPlayer1} + ${teamBPlayer2} (LOSE ${loserScore})`;
    } else {
      return `Court ${match.court}: ${teamAPlayer1} + ${teamAPlayer2} (LOSE ${loserScore}) vs ${teamBPlayer1} + ${teamBPlayer2} (WIN ${winnerScore})`;
    }
  } else {
    return `Court ${match.court}: ${teamAPlayer1} + ${teamAPlayer2} vs ${teamBPlayer1} + ${teamBPlayer2} (${teamAScore}-${teamBScore})`;
  }
}

// Format streak display
export function formatStreak(streak: number): string {
  if (streak === 0) return 'No streak';
  if (streak > 0) return `${streak}W`;
  return `${Math.abs(streak)}L`;
}

// Calculate skill rating adjustment after match (for dynamic skill updates)
export function calculateSkillAdjustment(
  playerSkill: number,
  opponentAverageSkill: number,
  isWinner: boolean,
  gamesWon: number,
  gamesLost: number
): number {
  // Simple ELO-like adjustment
  const expectedScore = 1 / (1 + Math.pow(10, (opponentAverageSkill - playerSkill) / 400));
  const actualScore = isWinner ? 1 : 0;
  const kFactor = 32; // Adjustment factor
  
  const baseAdjustment = kFactor * (actualScore - expectedScore);
  
  // Bonus/penalty based on game score
  let gameScoreMultiplier = 1;
  if (isWinner) {
    if (gamesWon === 4 && gamesLost <= 1) gameScoreMultiplier = 1.2; // Dominant win
  } else {
    if (gamesWon === 3 && gamesLost === 4) gameScoreMultiplier = 0.8; // Close loss
  }
  
  return Math.round(baseAdjustment * gameScoreMultiplier);
}

// Update player skill rating based on match performance
export function updatePlayerSkillRating(
  player: Player,
  teammateSkill: number,
  opponent1Skill: number,
  opponent2Skill: number,
  isWinner: boolean,
  gamesWon: number,
  gamesLost: number
): Player {
  const opponentAverageSkill = (opponent1Skill + opponent2Skill) / 2;
  const skillAdjustment = calculateSkillAdjustment(
    player.skill,
    opponentAverageSkill,
    isWinner,
    gamesWon,
    gamesLost
  );
  
  // Apply additional adjustments for extreme results
  let finalAdjustment = skillAdjustment;
  
  // Blowout adjustments
  if (gamesWon === 4 && gamesLost === 0) {
    // 4-0 result indicates significant skill mismatch
    finalAdjustment = isWinner ? finalAdjustment + 3 : finalAdjustment - 3;
  } else if (gamesWon === 4 && gamesLost === 1) {
    // 4-1 result indicates moderate skill difference
    finalAdjustment = isWinner ? finalAdjustment + 2 : finalAdjustment - 2;
  }
  
  // Ensure skill stays within reasonable bounds (20-100)
  const newSkill = Math.max(20, Math.min(100, player.skill + finalAdjustment));
  
  return {
    ...player,
    skill: newSkill,
  };
}

// Batch update all players' skills after a match
export function updateAllPlayersSkillsAfterMatch(
  players: Player[],
  match: Match
): Player[] {
  const teamAPlayer1 = players.find(p => p.id === match.teamA.player1Id);
  const teamAPlayer2 = players.find(p => p.id === match.teamA.player2Id);
  const teamBPlayer1 = players.find(p => p.id === match.teamB.player1Id);
  const teamBPlayer2 = players.find(p => p.id === match.teamB.player2Id);
  
  if (!teamAPlayer1 || !teamAPlayer2 || !teamBPlayer1 || !teamBPlayer2) {
    return players; // Return unchanged if any player not found
  }
  
  const teamAWon = match.teamA.gamesWon > match.teamB.gamesWon;
  
  return players.map(player => {
    if (player.id === match.teamA.player1Id) {
      return updatePlayerSkillRating(
        player,
        teamAPlayer2.skill,
        teamBPlayer1.skill,
        teamBPlayer2.skill,
        teamAWon,
        match.teamA.gamesWon,
        match.teamB.gamesWon
      );
    } else if (player.id === match.teamA.player2Id) {
      return updatePlayerSkillRating(
        player,
        teamAPlayer1.skill,
        teamBPlayer1.skill,
        teamBPlayer2.skill,
        teamAWon,
        match.teamA.gamesWon,
        match.teamB.gamesWon
      );
    } else if (player.id === match.teamB.player1Id) {
      return updatePlayerSkillRating(
        player,
        teamBPlayer2.skill,
        teamAPlayer1.skill,
        teamAPlayer2.skill,
        !teamAWon,
        match.teamB.gamesWon,
        match.teamA.gamesWon
      );
    } else if (player.id === match.teamB.player2Id) {
      return updatePlayerSkillRating(
        player,
        teamBPlayer1.skill,
        teamAPlayer1.skill,
        teamAPlayer2.skill,
        !teamAWon,
        match.teamB.gamesWon,
        match.teamA.gamesWon
      );
    }
    return player; // Return unchanged for players not in this match
  });
}
