export interface Player {
  id: string;
  name: string;
  skill: number; // 1-100
  gender?: 'male' | 'female'; // for mixed doubles support
  isGuest: boolean;
  availability: string[]; // array of date strings
  createdAt: string;
  stats: {
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    gamesWon: number;
    gamesLost: number;
    currentStreak: number;
    points: number;
    lastPlayed?: string;
  };
}

export interface Match {
  id: string;
  sessionId: string;
  round: number;
  court: string;
  status: 'waiting' | 'live' | 'completed';
  teamA: {
    player1Id: string;
    player2Id: string;
    gamesWon: number;
  };
  teamB: {
    player1Id: string;
    player2Id: string;
    gamesWon: number;
  };
  winner?: 'teamA' | 'teamB' | 'tie';
  startTime?: string;
  endTime?: string;
  history: GamePoint[]; // for undo functionality
}

export interface GamePoint {
  teamAScore: number;
  teamBScore: number;
  timestamp: string;
  action: 'teamA_score' | 'teamB_score' | 'undo';
}

export interface Session {
  id: string;
  date: string;
  availablePlayers: string[]; // player IDs
  matches: string[]; // match IDs
  status: 'planning' | 'active' | 'completed';
  tiers: {
    strong: string[]; // player IDs
    weak: string[]; // player IDs
  };
}

export interface Tournament {
  id: string;
  name: string;
  type: 'single-elimination' | 'double-elimination' | 'round-robin';
  roundRobinFormat?: 'regular-doubles' | 'mixed-doubles' | 'switch-doubles';
  status: 'setup' | 'active' | 'completed';
  currentRound: number;
  totalRounds: number;
  players: string[]; // player IDs
  bracket: TournamentMatch[][];
  roundRobinStandings?: RoundRobinStanding[];
  winner?: string; // player ID
  createdAt: string;
  completedAt?: string;
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  court?: string;
  teamA: {
    player1Id: string;
    player2Id: string;
    name: string; // team name for display
  };
  teamB: {
    player1Id: string;
    player2Id: string;
    name: string; // team name for display
  };
  winner?: 'teamA' | 'teamB';
  status: 'pending' | 'in-progress' | 'completed';
  score?: {
    teamA: number;
    teamB: number;
  };
}

export interface AppSettings {
  gamesToWin: number;
  courtsAvailable: string[];
  darkMode: boolean;
}

export type MatchmakingMode = 'skill-based' | 'random-balanced' | 'mixed-tiers' | 'tournament' | 'round-robin' | 'social-play';

export interface Team {
  player1: Player;
  player2: Player;
  combinedSkill: number;
}

export interface MatchPreview {
  court: string;
  teamA: Team;
  teamB: Team;
}

export interface RoundRobinStanding {
  teamId: string; // unique identifier for the team
  teamName: string;
  player1Id: string;
  player2Id: string;
  played: number; // matches played
  won: number; // matches won
  lost: number; // matches lost
  tied: number; // matches tied
  points: number; // total points (3 for win, 1 for tie, 0 for loss)
  pointsFor: number; // total games/points scored
  pointsAgainst: number; // total games/points conceded
  pointsDifference: number; // pointsFor - pointsAgainst
  rank: number; // current ranking
}

export interface RoundRobinMatch {
  id: string;
  round: number;
  matchNumber: number;
  court?: string;
  teamA: {
    teamId: string;
    player1Id: string;
    player2Id: string;
    name: string;
  };
  teamB: {
    teamId: string;
    player1Id: string;
    player2Id: string;
    name: string;
  };
  winner?: 'teamA' | 'teamB' | 'tie';
  status: 'pending' | 'in-progress' | 'completed';
  score?: {
    teamA: number;
    teamB: number;
  };
  pointsAwarded?: {
    teamA: number;
    teamB: number;
  };
}

export interface SessionPlayer extends Player {
  sessionStats: {
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    gamesWon: number;
    gamesLost: number;
    points: number;
  };
}
