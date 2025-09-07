export interface Player {
  id: string;
  name: string;
  skill: number; // 1-100
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
  winner?: 'teamA' | 'teamB';
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

export interface AppSettings {
  gamesToWin: number;
  courtsAvailable: string[];
  darkMode: boolean;
}

export type MatchmakingMode = 'skill-based' | 'random-balanced' | 'mixed-tiers';

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
