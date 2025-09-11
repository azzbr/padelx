import { Player, Match, Session, AppSettings, Tournament } from '../types';

const STORAGE_KEYS = {
  PLAYERS: 'padel_players',
  MATCHES: 'padel_matches',
  SESSIONS: 'padel_sessions',
  SETTINGS: 'padel_settings',
  TOURNAMENTS: 'padel_tournaments',
} as const;

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  gamesToWin: 6,
  courtsAvailable: ['A', 'B', 'C', 'D'],
  darkMode: false,
};

// Generic storage functions with enhanced error handling
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    // Check if localStorage is available
    if (typeof Storage === 'undefined') {
      console.warn('🚫 localStorage not available');
      return defaultValue;
    }

    const item = localStorage.getItem(key);
    if (!item) {
      console.log(`📭 No data found for key "${key}", using default`);
      return defaultValue;
    }

    const parsed = JSON.parse(item);

    // Validate the parsed data structure
    if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
      console.error(`❌ Invalid data structure for key "${key}": expected array, got ${typeof parsed}`);
      return defaultValue;
    }

    if (typeof defaultValue === 'object' && defaultValue !== null && (typeof parsed !== 'object' || parsed === null)) {
      console.error(`❌ Invalid data structure for key "${key}": expected object, got ${typeof parsed}`);
      return defaultValue;
    }

    console.log(`✅ Successfully loaded ${Array.isArray(parsed) ? parsed.length : 1} items for key "${key}"`);
    return parsed;
  } catch (error) {
    console.error(`❌ Error reading from localStorage key "${key}":`, error);
    // If parsing fails, clear the corrupted data
    try {
      localStorage.removeItem(key);
      console.log(`🧹 Cleared corrupted data for key "${key}"`);
    } catch (clearError) {
      console.error(`Failed to clear corrupted data for key "${key}":`, clearError);
    }
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    // Check if localStorage is available
    if (typeof Storage === 'undefined') {
      console.warn('localStorage not available, cannot save data');
      return;
    }

    // Validate data before saving
    if (data === undefined) {
      console.error(`Cannot save undefined data for key "${key}"`);
      return;
    }

    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);

    console.log(`💾 Successfully saved data for key "${key}" (${serialized.length} bytes)`);
  } catch (error) {
    console.error(`❌ Error saving to localStorage key "${key}":`, error);

    // If quota exceeded, try to clear old data and retry
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded, attempting to clear old data...');
      try {
        // Clear non-essential data first
        const keysToClear = ['padel_matches', 'padel_sessions'];
        keysToClear.forEach(keyToClear => {
          if (keyToClear !== key) {
            localStorage.removeItem(keyToClear);
          }
        });

        // Retry saving
        const serialized = JSON.stringify(data);
        localStorage.setItem(key, serialized);
        console.log(`✅ Successfully saved after clearing old data for key "${key}"`);
      } catch (retryError) {
        console.error('Failed to save even after clearing old data:', retryError);
      }
    }
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

// Tournament storage functions
export function getTournaments(): Tournament[] {
  return getFromStorage<Tournament[]>(STORAGE_KEYS.TOURNAMENTS, []);
}

export function saveTournaments(tournaments: Tournament[]): void {
  saveToStorage(STORAGE_KEYS.TOURNAMENTS, tournaments);
}

export function addTournament(tournament: Tournament): void {
  const tournaments = getTournaments();
  tournaments.push(tournament);
  saveTournaments(tournaments);
}

export function updateTournament(updatedTournament: Tournament): void {
  const tournaments = getTournaments();
  const index = tournaments.findIndex(t => t.id === updatedTournament.id);
  if (index !== -1) {
    tournaments[index] = updatedTournament;
    saveTournaments(tournaments);
  }
}

export function deleteTournament(tournamentId: string): void {
  const tournaments = getTournaments();
  const filteredTournaments = tournaments.filter(t => t.id !== tournamentId);
  saveTournaments(filteredTournaments);
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
    tournaments: getTournaments(),
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
    if (data.tournaments) saveTournaments(data.tournaments);
    if (data.settings) saveSettings(data.settings);

    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}
