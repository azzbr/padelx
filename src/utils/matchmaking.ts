import { Player, Team, MatchPreview, MatchmakingMode, Match, Session } from '../types';
import { getMatches, getSessions } from './storage';

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Calculate team balance score (lower is better)
function calculateTeamBalance(teamA: Team, teamB: Team): number {
  return Math.abs(teamA.combinedSkill - teamB.combinedSkill);
}

// Get recent matches from the last N sessions for duplicate prevention
function getRecentMatches(sessionCount: number = 3): Match[] {
  const sessions = getSessions();
  const matches = getMatches();
  
  // Get the most recent sessions (sorted by date, most recent first)
  const recentSessions = sessions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, sessionCount);
  
  // Get all match IDs from recent sessions
  const recentMatchIds = new Set<string>();
  recentSessions.forEach(session => {
    session.matches.forEach(matchId => recentMatchIds.add(matchId));
  });
  
  // Return matches from recent sessions
  return matches.filter(match => recentMatchIds.has(match.id));
}

// Check if two players have played together recently (as teammates or opponents)
function havePlayedTogether(player1Id: string, player2Id: string, recentMatches: Match[]): boolean {
  return recentMatches.some(match => {
    const players = [
      match.teamA.player1Id,
      match.teamA.player2Id,
      match.teamB.player1Id,
      match.teamB.player2Id
    ];
    
    // Check if both players were in the same match
    return players.includes(player1Id) && players.includes(player2Id);
  });
}

// Check if a specific team pairing has played recently
function havePlayedAsTeammates(player1Id: string, player2Id: string, recentMatches: Match[]): boolean {
  return recentMatches.some(match => {
    const teamA = [match.teamA.player1Id, match.teamA.player2Id];
    const teamB = [match.teamB.player1Id, match.teamB.player2Id];
    
    // Check if they were teammates in either team
    return (teamA.includes(player1Id) && teamA.includes(player2Id)) ||
           (teamB.includes(player1Id) && teamB.includes(player2Id));
  });
}

// Check if a specific match-up has occurred recently
function havePlayedAsOpponents(teamA: Team, teamB: Team, recentMatches: Match[]): boolean {
  const teamAIds = [teamA.player1.id, teamA.player2.id].sort();
  const teamBIds = [teamB.player1.id, teamB.player2.id].sort();
  
  return recentMatches.some(match => {
    const matchTeamA = [match.teamA.player1Id, match.teamA.player2Id].sort();
    const matchTeamB = [match.teamB.player1Id, match.teamB.player2Id].sort();
    
    // Check if exact same teams played (in either order)
    return (
      (teamAIds[0] === matchTeamA[0] && teamAIds[1] === matchTeamA[1] &&
       teamBIds[0] === matchTeamB[0] && teamBIds[1] === matchTeamB[1]) ||
      (teamAIds[0] === matchTeamB[0] && teamAIds[1] === matchTeamB[1] &&
       teamBIds[0] === matchTeamA[0] && teamBIds[1] === matchTeamA[1])
    );
  });
}

// Calculate a "freshness score" for a potential match (higher = more fresh/diverse)
function calculateMatchFreshness(teamA: Team, teamB: Team, recentMatches: Match[]): number {
  let score = 100; // Start with perfect freshness
  
  // Penalty for recent teammate pairings
  if (havePlayedAsTeammates(teamA.player1.id, teamA.player2.id, recentMatches)) {
    score -= 30;
  }
  if (havePlayedAsTeammates(teamB.player1.id, teamB.player2.id, recentMatches)) {
    score -= 30;
  }
  
  // Heavy penalty for exact same match-up
  if (havePlayedAsOpponents(teamA, teamB, recentMatches)) {
    score -= 50;
  }
  
  // Light penalty for any recent interactions between players
  const allPlayers = [teamA.player1.id, teamA.player2.id, teamB.player1.id, teamB.player2.id];
  let interactionCount = 0;
  
  for (let i = 0; i < allPlayers.length; i++) {
    for (let j = i + 1; j < allPlayers.length; j++) {
      if (havePlayedTogether(allPlayers[i], allPlayers[j], recentMatches)) {
        interactionCount++;
      }
    }
  }
  
  score -= interactionCount * 5; // 5 points per recent interaction
  
  return Math.max(0, score);
}

// Create a team from two players
function createTeam(player1: Player, player2: Player): Team {
  return {
    player1,
    player2,
    combinedSkill: player1.skill + player2.skill,
  };
}

// Get available courts based on player count
function getAvailableCourts(playerCount: number): string[] {
  const courts = ['A', 'B', 'C', 'D'];
  const matchCount = Math.floor(playerCount / 4);
  return courts.slice(0, matchCount);
}

// Calculate team balance score (0 = perfect balance, higher = more imbalanced)
function calculateBalanceScore(teamA: Team, teamB: Team): number {
  return Math.abs(teamA.combinedSkill - teamB.combinedSkill);
}

// Validate team balance and provide warnings
function validateTeamBalance(teamA: Team, teamB: Team): { isBalanced: boolean; warning?: string; severity: 'low' | 'medium' | 'high' } {
  const balanceScore = calculateBalanceScore(teamA, teamB);
  
  if (balanceScore <= 10) {
    return { isBalanced: true, severity: 'low' };
  } else if (balanceScore <= 20) {
    return { 
      isBalanced: false, 
      warning: `Teams are moderately unbalanced (${balanceScore} point difference). Consider adjusting player skill ratings.`,
      severity: 'medium'
    };
  } else {
    return { 
      isBalanced: false, 
      warning: `Teams are severely unbalanced (${balanceScore} point difference)! Matches will likely be blowouts. Please adjust player skill ratings.`,
      severity: 'high'
    };
  }
}

// Skill-based matchmaking algorithm
export function generateSkillBasedMatches(players: Player[]): MatchPreview[] {
  if (players.length < 4 || players.length % 4 !== 0) {
    throw new Error('Player count must be a multiple of 4 (minimum 4 players)');
  }

  const matchCount = Math.floor(players.length / 4);
  const courts = getAvailableCourts(players.length);
  
  // Sort players by skill (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.skill - a.skill);
  
  if (players.length === 4) {
    // FIXED: Always use 1st+4th vs 2nd+3rd for optimal balance
    const teamA = createTeam(sortedPlayers[0], sortedPlayers[3]); // Strongest + Weakest
    const teamB = createTeam(sortedPlayers[1], sortedPlayers[2]); // Middle players
    
    // Validate balance
    const balance = validateTeamBalance(teamA, teamB);
    if (!balance.isBalanced && balance.severity === 'high') {
      console.warn('Skill-based matching:', balance.warning);
    }
    
    return [{ court: 'A', teamA, teamB }];
  }
  
  // For 8+ players, use improved tier-based matching
  const matches: MatchPreview[] = [];
  const usedPlayers = new Set<string>();
  
  // Create matches by pairing strongest with weakest for balance
  for (let i = 0; i < matchCount; i++) {
    const availablePlayers = sortedPlayers.filter(p => !usedPlayers.has(p.id));
    
    if (availablePlayers.length >= 4) {
      // Take strongest and weakest available players for each team
      const teamA = createTeam(availablePlayers[0], availablePlayers[availablePlayers.length - 1]);
      const teamB = createTeam(availablePlayers[1], availablePlayers[availablePlayers.length - 2]);
      
      // Mark players as used
      [teamA.player1, teamA.player2, teamB.player1, teamB.player2].forEach(p => {
        usedPlayers.add(p.id);
      });
      
      // Validate balance
      const balance = validateTeamBalance(teamA, teamB);
      if (!balance.isBalanced && balance.severity === 'high') {
        console.warn(`Match ${i + 1} balance warning:`, balance.warning);
      }
      
      matches.push({ court: courts[i], teamA, teamB });
    }
  }
  
  return matches;
}

// Random balanced matchmaking algorithm
export function generateRandomBalancedMatches(players: Player[]): MatchPreview[] {
  if (players.length < 4 || players.length % 4 !== 0) {
    throw new Error('Player count must be a multiple of 4 (minimum 4 players)');
  }

  const matchCount = Math.floor(players.length / 4);
  const courts = getAvailableCourts(players.length);
  
  // Shuffle players randomly
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  
  if (players.length === 4) {
    // Simple pairing for 4 players
    const teams = [
      createTeam(shuffledPlayers[0], shuffledPlayers[1]),
      createTeam(shuffledPlayers[2], shuffledPlayers[3]),
    ];
    
    return [{ court: 'A', teamA: teams[0], teamB: teams[1] }];
  }
  
  // For more players, create all possible teams and select balanced ones
  const allTeams: Team[] = [];
  for (let i = 0; i < shuffledPlayers.length; i++) {
    for (let j = i + 1; j < shuffledPlayers.length; j++) {
      allTeams.push(createTeam(shuffledPlayers[i], shuffledPlayers[j]));
    }
  }
  
  // Sort teams by combined skill for better balance
  allTeams.sort((a, b) => a.combinedSkill - b.combinedSkill);
  
  // Select required number of teams ensuring no player appears twice
  const teamsNeeded = matchCount * 2;
  const selectedTeams: Team[] = [];
  const usedPlayerIds = new Set<string>();
  
  for (const team of allTeams) {
    if (selectedTeams.length >= teamsNeeded) break;
    
    if (!usedPlayerIds.has(team.player1.id) && !usedPlayerIds.has(team.player2.id)) {
      selectedTeams.push(team);
      usedPlayerIds.add(team.player1.id);
      usedPlayerIds.add(team.player2.id);
    }
  }
  
  // If we don't have enough teams, fall back to simple pairing
  if (selectedTeams.length < teamsNeeded) {
    selectedTeams.length = 0;
    usedPlayerIds.clear();
    
    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      selectedTeams.push(createTeam(shuffledPlayers[i], shuffledPlayers[i + 1]));
    }
  }
  
  // Create matches by pairing teams with similar skill levels
  const sortedTeams = selectedTeams.sort((a, b) => a.combinedSkill - b.combinedSkill);
  const matches: MatchPreview[] = [];
  
  for (let i = 0; i < matchCount; i++) {
    const teamA = sortedTeams[i];
    const teamB = sortedTeams[sortedTeams.length - 1 - i];
    matches.push({ court: courts[i], teamA, teamB });
  }
  
  return matches;
}

// Mixed tiers matchmaking algorithm
export function generateMixedTiersMatches(players: Player[]): MatchPreview[] {
  if (players.length < 4 || players.length % 4 !== 0) {
    throw new Error('Player count must be a multiple of 4 (minimum 4 players)');
  }

  const matchCount = Math.floor(players.length / 4);
  const courts = getAvailableCourts(players.length);
  
  // Sort players by skill
  const sortedPlayers = [...players].sort((a, b) => b.skill - a.skill);
  
  if (players.length === 4) {
    // For 4 players, pair strongest with weakest
    const teams = [
      createTeam(sortedPlayers[0], sortedPlayers[3]), // 1st + 4th
      createTeam(sortedPlayers[1], sortedPlayers[2]), // 2nd + 3rd
    ];
    
    return [{ court: 'A', teamA: teams[0], teamB: teams[1] }];
  }
  
  // Divide into strong and weak players
  const playersPerTier = Math.floor(players.length / 2);
  const strongPlayers = sortedPlayers.slice(0, playersPerTier);
  const weakPlayers = sortedPlayers.slice(playersPerTier);
  
  // Shuffle each tier to add randomness
  const shuffledStrong = strongPlayers.sort(() => Math.random() - 0.5);
  const shuffledWeak = weakPlayers.sort(() => Math.random() - 0.5);
  
  // Create teams with one strong + one weak player
  const teams: Team[] = [];
  const teamsNeeded = matchCount * 2;
  
  for (let i = 0; i < teamsNeeded; i++) {
    teams.push(createTeam(shuffledStrong[i], shuffledWeak[i]));
  }
  
  // Sort teams by combined skill for balanced matches
  const sortedTeams = teams.sort((a, b) => a.combinedSkill - b.combinedSkill);
  
  // Create matches
  const matches: MatchPreview[] = [];
  
  for (let i = 0; i < matchCount; i++) {
    const teamA = sortedTeams[i];
    const teamB = sortedTeams[sortedTeams.length - 1 - i];
    matches.push({ court: courts[i], teamA, teamB });
  }
  
  return matches;
}

// Enhanced matchmaking with duplicate prevention
export function generateMatchesWithDuplicatePrevention(players: Player[], mode: MatchmakingMode): MatchPreview[] {
  const recentMatches = getRecentMatches(3); // Check last 3 sessions
  
  // Generate multiple potential match sets and pick the best one
  const attempts = 5; // Try 5 different combinations
  let bestMatches: MatchPreview[] = [];
  let bestScore = -1;
  
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      let potentialMatches: MatchPreview[];
      
      switch (mode) {
        case 'skill-based':
          potentialMatches = generateSkillBasedMatchesWithFreshness(players, recentMatches);
          break;
        case 'random-balanced':
          potentialMatches = generateRandomBalancedMatches(players);
          break;
        case 'mixed-tiers':
          potentialMatches = generateMixedTiersMatches(players);
          break;
        default:
          throw new Error(`Unknown matchmaking mode: ${mode}`);
      }
      
      // Calculate overall freshness score for this set of matches
      const totalFreshness = potentialMatches.reduce((sum, match) => {
        return sum + calculateMatchFreshness(match.teamA, match.teamB, recentMatches);
      }, 0);
      
      if (totalFreshness > bestScore) {
        bestScore = totalFreshness;
        bestMatches = potentialMatches;
      }
    } catch (error) {
      console.warn(`Matchmaking attempt ${attempt + 1} failed:`, error);
    }
  }
  
  // If we couldn't generate any matches, fall back to basic algorithm
  if (bestMatches.length === 0) {
    console.warn('Falling back to basic matchmaking without duplicate prevention');
    return generateMatches(players, mode);
  }
  
  // Log freshness information
  if (recentMatches.length > 0) {
    console.log(`Generated matches with freshness score: ${bestScore}`);
    bestMatches.forEach((match, index) => {
      const freshness = calculateMatchFreshness(match.teamA, match.teamB, recentMatches);
      if (freshness < 70) {
        console.warn(`Match ${index + 1} has low freshness (${freshness}): Some players have played recently`);
      }
    });
  }
  
  return bestMatches;
}

// Enhanced skill-based matchmaking with freshness consideration
function generateSkillBasedMatchesWithFreshness(players: Player[], recentMatches: Match[]): MatchPreview[] {
  if (players.length < 4 || players.length % 4 !== 0) {
    throw new Error('Player count must be a multiple of 4 (minimum 4 players)');
  }

  const matchCount = Math.floor(players.length / 4);
  const courts = getAvailableCourts(players.length);
  
  // Sort players by skill (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.skill - a.skill);
  
  if (players.length === 4) {
    // For 4 players, try different combinations and pick the freshest
    const combinations = [
      // Standard skill-based: 1st+4th vs 2nd+3rd
      {
        teamA: createTeam(sortedPlayers[0], sortedPlayers[3]),
        teamB: createTeam(sortedPlayers[1], sortedPlayers[2])
      },
      // Alternative: 1st+3rd vs 2nd+4th
      {
        teamA: createTeam(sortedPlayers[0], sortedPlayers[2]),
        teamB: createTeam(sortedPlayers[1], sortedPlayers[3])
      },
      // Alternative: 1st+2nd vs 3rd+4th
      {
        teamA: createTeam(sortedPlayers[0], sortedPlayers[1]),
        teamB: createTeam(sortedPlayers[2], sortedPlayers[3])
      }
    ];
    
    // Pick the combination with best balance + freshness
    let bestCombination = combinations[0];
    let bestScore = -1;
    
    combinations.forEach(combo => {
      const balanceScore = 100 - calculateBalanceScore(combo.teamA, combo.teamB); // Higher is better
      const freshnessScore = calculateMatchFreshness(combo.teamA, combo.teamB, recentMatches);
      const totalScore = balanceScore * 0.6 + freshnessScore * 0.4; // 60% balance, 40% freshness
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestCombination = combo;
      }
    });
    
    // Validate balance
    const balance = validateTeamBalance(bestCombination.teamA, bestCombination.teamB);
    if (!balance.isBalanced && balance.severity === 'high') {
      console.warn('Skill-based matching:', balance.warning);
    }
    
    return [{ court: 'A', teamA: bestCombination.teamA, teamB: bestCombination.teamB }];
  }
  
  // For 8+ players, use improved algorithm with freshness consideration
  const matches: MatchPreview[] = [];
  const usedPlayers = new Set<string>();
  
  // Create matches by pairing strongest with weakest for balance, considering freshness
  for (let i = 0; i < matchCount; i++) {
    const availablePlayers = sortedPlayers.filter(p => !usedPlayers.has(p.id));
    
    if (availablePlayers.length >= 4) {
      // Try different combinations and pick the best one
      const combinations = [];
      
      // Standard approach: strongest + weakest vs middle players
      if (availablePlayers.length >= 4) {
        combinations.push({
          teamA: createTeam(availablePlayers[0], availablePlayers[availablePlayers.length - 1]),
          teamB: createTeam(availablePlayers[1], availablePlayers[availablePlayers.length - 2])
        });
      }
      
      // Alternative approaches for variety
      if (availablePlayers.length >= 6) {
        combinations.push({
          teamA: createTeam(availablePlayers[0], availablePlayers[availablePlayers.length - 2]),
          teamB: createTeam(availablePlayers[1], availablePlayers[availablePlayers.length - 1])
        });
      }
      
      // Pick the best combination
      let bestCombination = combinations[0];
      let bestScore = -1;
      
      combinations.forEach(combo => {
        const balanceScore = 100 - calculateBalanceScore(combo.teamA, combo.teamB);
        const freshnessScore = calculateMatchFreshness(combo.teamA, combo.teamB, recentMatches);
        const totalScore = balanceScore * 0.7 + freshnessScore * 0.3; // 70% balance, 30% freshness
        
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestCombination = combo;
        }
      });
      
      // Mark players as used
      [bestCombination.teamA.player1, bestCombination.teamA.player2, 
       bestCombination.teamB.player1, bestCombination.teamB.player2].forEach(p => {
        usedPlayers.add(p.id);
      });
      
      // Validate balance
      const balance = validateTeamBalance(bestCombination.teamA, bestCombination.teamB);
      if (!balance.isBalanced && balance.severity === 'high') {
        console.warn(`Match ${i + 1} balance warning:`, balance.warning);
      }
      
      matches.push({ court: courts[i], teamA: bestCombination.teamA, teamB: bestCombination.teamB });
    }
  }
  
  return matches;
}

// Main matchmaking function (backwards compatibility)
export function generateMatches(players: Player[], mode: MatchmakingMode): MatchPreview[] {
  switch (mode) {
    case 'skill-based':
      return generateSkillBasedMatches(players);
    case 'random-balanced':
      return generateRandomBalancedMatches(players);
    case 'mixed-tiers':
      return generateMixedTiersMatches(players);
    default:
      throw new Error(`Unknown matchmaking mode: ${mode}`);
  }
}

// Calculate match quality metrics
export function calculateMatchQuality(matches: MatchPreview[]): {
  overallScore: number;
  balanceScore: number;
  freshnessScore: number;
  details: {
    perfectlyBalanced: number;
    goodMatches: number;
    unbalanced: number;
    averageSkillDifference: number;
  };
} {
  if (matches.length === 0) {
    return {
      overallScore: 0,
      balanceScore: 0,
      freshnessScore: 0,
      details: {
        perfectlyBalanced: 0,
        goodMatches: 0,
        unbalanced: 0,
        averageSkillDifference: 0,
      }
    };
  }

  const recentMatches = getRecentMatches(3);
  let totalBalanceScore = 0;
  let totalFreshnessScore = 0;
  let perfectlyBalanced = 0;
  let goodMatches = 0;
  let unbalanced = 0;
  let totalSkillDifference = 0;

  matches.forEach(match => {
    const skillDiff = Math.abs(match.teamA.combinedSkill - match.teamB.combinedSkill);
    totalSkillDifference += skillDiff;

    // Balance scoring (0-100, higher is better)
    const balanceScore = Math.max(0, 100 - skillDiff * 2);
    totalBalanceScore += balanceScore;

    // Freshness scoring
    const freshnessScore = calculateMatchFreshness(match.teamA, match.teamB, recentMatches);
    totalFreshnessScore += freshnessScore;

    // Categorize matches
    if (skillDiff <= 5) {
      perfectlyBalanced++;
    } else if (skillDiff <= 10) {
      goodMatches++;
    } else {
      unbalanced++;
    }
  });

  const averageBalanceScore = totalBalanceScore / matches.length;
  const averageFreshnessScore = totalFreshnessScore / matches.length;
  const averageSkillDifference = totalSkillDifference / matches.length;

  // Overall quality score (weighted average)
  const overallScore = (averageBalanceScore * 0.7) + (averageFreshnessScore * 0.3);

  return {
    overallScore: Math.round(overallScore),
    balanceScore: Math.round(averageBalanceScore),
    freshnessScore: Math.round(averageFreshnessScore),
    details: {
      perfectlyBalanced,
      goodMatches,
      unbalanced,
      averageSkillDifference: Math.round(averageSkillDifference * 10) / 10,
    }
  };
}

// Get quality rating text and color
export function getQualityRating(score: number): { text: string; color: string; bgColor: string } {
  if (score >= 90) {
    return { text: 'Excellent', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900' };
  } else if (score >= 75) {
    return { text: 'Very Good', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900' };
  } else if (score >= 60) {
    return { text: 'Good', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900' };
  } else if (score >= 40) {
    return { text: 'Fair', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900' };
  } else {
    return { text: 'Poor', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900' };
  }
}

// Validate match preview
export function validateMatchPreview(matches: MatchPreview[]): string[] {
  const errors: string[] = [];
  const usedPlayerIds = new Set<string>();
  
  if (matches.length < 1 || matches.length > 4) {
    errors.push('Must have between 1-4 matches');
  }
  
  for (const match of matches) {
    // Check for duplicate players
    const playerIds = [
      match.teamA.player1.id,
      match.teamA.player2.id,
      match.teamB.player1.id,
      match.teamB.player2.id,
    ];
    
    for (const playerId of playerIds) {
      if (usedPlayerIds.has(playerId)) {
        errors.push(`Player appears in multiple matches: ${playerId}`);
      }
      usedPlayerIds.add(playerId);
    }
    
    // Check team composition
    if (match.teamA.player1.id === match.teamA.player2.id) {
      errors.push(`Team A has duplicate player in match ${match.court}`);
    }
    if (match.teamB.player1.id === match.teamB.player2.id) {
      errors.push(`Team B has duplicate player in match ${match.court}`);
    }
  }
  
  return errors;
}
