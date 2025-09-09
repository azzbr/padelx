import { Player, Match, Session, AppSettings } from '../types';

const STORAGE_KEYS = {
  PLAYERS: 'padel_players',
  MATCHES: 'padel_matches',
  SESSIONS: 'padel_sessions',
  SETTINGS: 'padel_settings',
} as const;

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  gamesToWin: 6,
  courtsAvailable: ['A', 'B', 'C', 'D'],
  darkMode: false,
};

// Generic storage functions
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage key "${key}":`, error);
  }
}

// Player storage functions
export function getPlayers(): Player[] {
  return getFromStorage<Player[]>(STORAGE_KEYS.PLAYERS, []);
}

export function savePlayers(players: Player[]): void {
  saveToStorage(STORAGE_KEYS.PLAYERS, players);
}

export function addPlayer(player: Player): void {
  const players = getPlayers();
  players.push(player);
  savePlayers(players);
}

export function updatePlayer(updatedPlayer: Player): void {
  const players = getPlayers();
  const index = players.findIndex(p => p.id === updatedPlayer.id);
  if (index !== -1) {
    players[index] = updatedPlayer;
    savePlayers(players);
  }
}

export function deletePlayer(playerId: string): void {
  const players = getPlayers();
  const filteredPlayers = players.filter(p => p.id !== playerId);
  savePlayers(filteredPlayers);
}

// Match storage functions
export function getMatches(): Match[] {
  return getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);
}

export function saveMatches(matches: Match[]): void {
  saveToStorage(STORAGE_KEYS.MATCHES, matches);
}

export function addMatch(match: Match): void {
  const matches = getMatches();
  matches.push(match);
  saveMatches(matches);
}

export function updateMatch(updatedMatch: Match): void {
  const matches = getMatches();
  const index = matches.findIndex(m => m.id === updatedMatch.id);
  if (index !== -1) {
    matches[index] = updatedMatch;
    saveMatches(matches);
  }
}

// Session storage functions
export function getSessions(): Session[] {
  return getFromStorage<Session[]>(STORAGE_KEYS.SESSIONS, []);
}

export function saveSessions(sessions: Session[]): void {
  saveToStorage(STORAGE_KEYS.SESSIONS, sessions);
}

export function addSession(session: Session): void {
  const sessions = getSessions();
  sessions.push(session);
  saveSessions(sessions);
}

export function updateSession(updatedSession: Session): void {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === updatedSession.id);
  if (index !== -1) {
    sessions[index] = updatedSession;
    saveSessions(sessions);
  }
}

// Settings storage functions
export function getSettings(): AppSettings {
  return getFromStorage<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

// Utility functions
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

export function exportData(): string {
  const data = {
    players: getPlayers(),
    matches: getMatches(),
    sessions: getSessions(),
    settings: getSettings(),
    exportDate: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);
    
    if (data.players) savePlayers(data.players);
    if (data.matches) saveMatches(data.matches);
    if (data.sessions) saveSessions(data.sessions);
    if (data.settings) saveSettings(data.settings);
    
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}
