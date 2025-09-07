import { Player, Team, MatchPreview, MatchmakingMode } from '../types';

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Calculate team balance score (lower is better)
function calculateTeamBalance(teamA: Team, teamB: Team): number {
  return Math.abs(teamA.combinedSkill - teamB.combinedSkill);
}

// Check if two players have played together recently
function havePlayedTogether(player1Id: string, player2Id: string, recentMatches: any[]): boolean {
  // For beta version, we'll implement a simple check
  // In production, this would check the last 3 sessions
  return false; // Placeholder for now
}

// Create a team from two players
function createTeam(player1: Player, player2: Player): Team {
  return {
    player1,
    player2,
    combinedSkill: player1.skill + player2.skill,
  };
}

// Skill-based matchmaking algorithm
export function generateSkillBasedMatches(players: Player[]): MatchPreview[] {
  if (players.length !== 16) {
    throw new Error('Exactly 16 players are required for skill-based matchmaking');
  }

  // Sort players by skill (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.skill - a.skill);
  
  // Divide into tiers
  const strongTier = sortedPlayers.slice(0, 8);
  const weakTier = sortedPlayers.slice(8, 16);
  
  // Create balanced teams within each tier
  const strongTeams: Team[] = [
    createTeam(strongTier[0], strongTier[7]), // 1st + 8th
    createTeam(strongTier[1], strongTier[6]), // 2nd + 7th
    createTeam(strongTier[2], strongTier[5]), // 3rd + 6th
    createTeam(strongTier[3], strongTier[4]), // 4th + 5th
  ];
  
  const weakTeams: Team[] = [
    createTeam(weakTier[0], weakTier[7]),
    createTeam(weakTier[1], weakTier[6]),
    createTeam(weakTier[2], weakTier[5]),
    createTeam(weakTier[3], weakTier[4]),
  ];
  
  // Create matches with closest combined skills
  return [
    { court: 'A', teamA: strongTeams[0], teamB: strongTeams[3] },
    { court: 'B', teamA: strongTeams[1], teamB: strongTeams[2] },
    { court: 'C', teamA: weakTeams[0], teamB: weakTeams[3] },
    { court: 'D', teamA: weakTeams[1], teamB: weakTeams[2] },
  ];
}

// Random balanced matchmaking algorithm
export function generateRandomBalancedMatches(players: Player[]): MatchPreview[] {
  if (players.length !== 16) {
    throw new Error('Exactly 16 players are required for random balanced matchmaking');
  }

  // Shuffle players randomly
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  
  // Create all possible teams
  const allTeams: Team[] = [];
  for (let i = 0; i < shuffledPlayers.length; i++) {
    for (let j = i + 1; j < shuffledPlayers.length; j++) {
      allTeams.push(createTeam(shuffledPlayers[i], shuffledPlayers[j]));
    }
  }
  
  // Sort teams by combined skill for better balance
  allTeams.sort((a, b) => a.combinedSkill - b.combinedSkill);
  
  // Select 8 teams ensuring no player appears twice
  const selectedTeams: Team[] = [];
  const usedPlayerIds = new Set<string>();
  
  for (const team of allTeams) {
    if (selectedTeams.length >= 8) break;
    
    if (!usedPlayerIds.has(team.player1.id) && !usedPlayerIds.has(team.player2.id)) {
      selectedTeams.push(team);
      usedPlayerIds.add(team.player1.id);
      usedPlayerIds.add(team.player2.id);
    }
  }
  
  // If we don't have 8 teams, fall back to simple pairing
  if (selectedTeams.length < 8) {
    selectedTeams.length = 0;
    usedPlayerIds.clear();
    
    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      selectedTeams.push(createTeam(shuffledPlayers[i], shuffledPlayers[i + 1]));
    }
  }
  
  // Create matches by pairing teams with similar skill levels
  const sortedTeams = selectedTeams.sort((a, b) => a.combinedSkill - b.combinedSkill);
  
  return [
    { court: 'A', teamA: sortedTeams[0], teamB: sortedTeams[7] },
    { court: 'B', teamA: sortedTeams[1], teamB: sortedTeams[6] },
    { court: 'C', teamA: sortedTeams[2], teamB: sortedTeams[5] },
    { court: 'D', teamA: sortedTeams[3], teamB: sortedTeams[4] },
  ];
}

// Mixed tiers matchmaking algorithm
export function generateMixedTiersMatches(players: Player[]): MatchPreview[] {
  if (players.length !== 16) {
    throw new Error('Exactly 16 players are required for mixed tiers matchmaking');
  }

  // Sort players by skill
  const sortedPlayers = [...players].sort((a, b) => b.skill - a.skill);
  
  // Divide into strong and weak players
  const strongPlayers = sortedPlayers.slice(0, 8);
  const weakPlayers = sortedPlayers.slice(8, 16);
  
  // Shuffle each tier
  const shuffledStrong = strongPlayers.sort(() => Math.random() - 0.5);
  const shuffledWeak = weakPlayers.sort(() => Math.random() - 0.5);
  
  // Create teams with one strong + one weak player
  const teams: Team[] = [];
  for (let i = 0; i < 8; i++) {
    teams.push(createTeam(shuffledStrong[i], shuffledWeak[i]));
  }
  
  // Sort teams by combined skill for balanced matches
  const sortedTeams = teams.sort((a, b) => a.combinedSkill - b.combinedSkill);
  
  return [
    { court: 'A', teamA: sortedTeams[0], teamB: sortedTeams[7] },
    { court: 'B', teamA: sortedTeams[1], teamB: sortedTeams[6] },
    { court: 'C', teamA: sortedTeams[2], teamB: sortedTeams[5] },
    { court: 'D', teamA: sortedTeams[3], teamB: sortedTeams[4] },
  ];
}

// Main matchmaking function
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

// Validate match preview
export function validateMatchPreview(matches: MatchPreview[]): string[] {
  const errors: string[] = [];
  const usedPlayerIds = new Set<string>();
  
  if (matches.length !== 4) {
    errors.push('Must have exactly 4 matches');
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
