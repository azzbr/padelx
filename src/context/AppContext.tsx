import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Player, Match, Session, AppSettings, MatchmakingMode, Tournament } from '../types';
import {
  getPlayers,
  getMatches,
  getSessions,
  getSettings,
  getTournaments,
  savePlayers,
  saveMatches,
  saveSessions,
  saveSettings,
  saveTournaments,
  addTournament as addTournamentToStorage,
  updateTournament as updateTournamentInStorage,
  deleteTournament as deleteTournamentFromStorage
} from '../utils/storage';

// State interface
interface AppState {
  players: Player[];
  matches: Match[];
  sessions: Session[];
  tournaments: Tournament[];
  settings: AppSettings;
  currentSession: Session | null;
  currentTournament: Tournament | null;
  loading: boolean;
  error: string | null;
}

// Action types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_DATA' }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'UPDATE_PLAYER'; payload: Player }
  | { type: 'DELETE_PLAYER'; payload: string }
  | { type: 'SET_PLAYERS'; payload: Player[] }
  | { type: 'ADD_MATCH'; payload: Match }
  | { type: 'UPDATE_MATCH'; payload: Match }
  | { type: 'SET_MATCHES'; payload: Match[] }
  | { type: 'ADD_SESSION'; payload: Session }
  | { type: 'UPDATE_SESSION'; payload: Session }
  | { type: 'SET_SESSIONS'; payload: Session[] }
  | { type: 'SET_CURRENT_SESSION'; payload: Session | null }
  | { type: 'ADD_TOURNAMENT'; payload: Tournament }
  | { type: 'UPDATE_TOURNAMENT'; payload: Tournament }
  | { type: 'SET_TOURNAMENTS'; payload: Tournament[] }
  | { type: 'SET_CURRENT_TOURNAMENT'; payload: Tournament | null }
  | { type: 'UPDATE_SETTINGS'; payload: AppSettings }
  | { type: 'LOAD_SAMPLE_DATA' };

// Initial state
const initialState: AppState = {
  players: [],
  matches: [],
  sessions: [],
  tournaments: [],
  settings: {
    gamesToWin: 6,
    courtsAvailable: ['A', 'B', 'C', 'D'],
    darkMode: false,
  },
  currentSession: null,
  currentTournament: null,
  loading: false,
  error: null,
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'LOAD_DATA':
      return {
        ...state,
        players: getPlayers(),
        matches: getMatches(),
        sessions: getSessions(),
        tournaments: getTournaments(),
        settings: getSettings(),
      };
    
    case 'ADD_PLAYER':
      const newPlayers = [...state.players, action.payload];
      savePlayers(newPlayers);
      return { ...state, players: newPlayers };
    
    case 'UPDATE_PLAYER':
      const updatedPlayers = state.players.map(p => 
        p.id === action.payload.id ? action.payload : p
      );
      savePlayers(updatedPlayers);
      return { ...state, players: updatedPlayers };
    
    case 'DELETE_PLAYER':
      const filteredPlayers = state.players.filter(p => p.id !== action.payload);
      savePlayers(filteredPlayers);
      return { ...state, players: filteredPlayers };
    
    case 'SET_PLAYERS':
      savePlayers(action.payload);
      return { ...state, players: action.payload };
    
    case 'ADD_MATCH':
      const newMatches = [...state.matches, action.payload];
      saveMatches(newMatches);
      return { ...state, matches: newMatches };
    
    case 'UPDATE_MATCH':
      const updatedMatches = state.matches.map(m => 
        m.id === action.payload.id ? action.payload : m
      );
      saveMatches(updatedMatches);
      return { ...state, matches: updatedMatches };
    
    case 'SET_MATCHES':
      saveMatches(action.payload);
      return { ...state, matches: action.payload };
    
    case 'ADD_SESSION':
      const newSessions = [...state.sessions, action.payload];
      saveSessions(newSessions);
      return { ...state, sessions: newSessions };
    
    case 'UPDATE_SESSION':
      const updatedSessions = state.sessions.map(s => 
        s.id === action.payload.id ? action.payload : s
      );
      saveSessions(updatedSessions);
      return { ...state, sessions: updatedSessions };
    
    case 'SET_SESSIONS':
      saveSessions(action.payload);
      return { ...state, sessions: action.payload };
    
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSession: action.payload };

    case 'ADD_TOURNAMENT':
      const newTournaments = [...state.tournaments, action.payload];
      addTournamentToStorage(action.payload);
      return { ...state, tournaments: newTournaments };

    case 'UPDATE_TOURNAMENT':
      const updatedTournaments = state.tournaments.map(t =>
        t.id === action.payload.id ? action.payload : t
      );
      // Also update currentTournament if it's the same tournament
      const updatedCurrentTournament = state.currentTournament?.id === action.payload.id
        ? action.payload
        : state.currentTournament;
      updateTournamentInStorage(action.payload);
      return {
        ...state,
        tournaments: updatedTournaments,
        currentTournament: updatedCurrentTournament
      };

    case 'SET_TOURNAMENTS':
      return { ...state, tournaments: action.payload };

    case 'SET_CURRENT_TOURNAMENT':
      return { ...state, currentTournament: action.payload };

    case 'UPDATE_SETTINGS':
      saveSettings(action.payload);
      return { ...state, settings: action.payload };
    
    case 'LOAD_SAMPLE_DATA':
      const sampleData = generateSampleData();
      savePlayers(sampleData.players);
      saveMatches(sampleData.matches);
      saveSessions(sampleData.sessions);
      return {
        ...state,
        players: sampleData.players,
        matches: sampleData.matches,
        sessions: sampleData.sessions,
      };
    
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data on mount
  useEffect(() => {
    dispatch({ type: 'LOAD_DATA' });
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (state.settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.settings.darkMode]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Helper functions for common operations
export function useAppActions() {
  const { dispatch } = useApp();

  return {
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    addPlayer: (player: Player) => dispatch({ type: 'ADD_PLAYER', payload: player }),
    updatePlayer: (player: Player) => dispatch({ type: 'UPDATE_PLAYER', payload: player }),
    deletePlayer: (playerId: string) => dispatch({ type: 'DELETE_PLAYER', payload: playerId }),
    addMatch: (match: Match) => dispatch({ type: 'ADD_MATCH', payload: match }),
    updateMatch: (match: Match) => dispatch({ type: 'UPDATE_MATCH', payload: match }),
    addSession: (session: Session) => dispatch({ type: 'ADD_SESSION', payload: session }),
    updateSession: (session: Session) => dispatch({ type: 'UPDATE_SESSION', payload: session }),
    setCurrentSession: (session: Session | null) => dispatch({ type: 'SET_CURRENT_SESSION', payload: session }),
    addTournament: (tournament: Tournament) => dispatch({ type: 'ADD_TOURNAMENT', payload: tournament }),
    updateTournament: (tournament: Tournament) => dispatch({ type: 'UPDATE_TOURNAMENT', payload: tournament }),
    setCurrentTournament: (tournament: Tournament | null) => dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: tournament }),
    updateSettings: (settings: AppSettings) => dispatch({ type: 'UPDATE_SETTINGS', payload: settings }),
    loadSampleData: () => dispatch({ type: 'LOAD_SAMPLE_DATA' }),
  };
}

// Generate sample data for testing
function generateSampleData() {
  const samplePlayers: Player[] = [
    'Salmeen', 'Nawaf', 'Khalid', 'Janahi', 'Bu Faisal', 'Badran', 'Bucheeri', 'Al Mannai',
    'Ahmed', 'Omar', 'Faisal', 'Hamad', 'Saeed', 'Rashid', 'Yousef', 'Mansour',
    'Abdulla', 'Mohammed', 'Ali', 'Hassan'
  ].map((name, index) => ({
    id: `player-${index + 1}`,
    name,
    skill: Math.floor(Math.random() * 60) + 30, // 30-90 skill range
    isGuest: false,
    availability: [new Date().toISOString().split('T')[0]], // Available today
    createdAt: new Date().toISOString(),
    stats: {
      matchesPlayed: Math.floor(Math.random() * 10),
      matchesWon: Math.floor(Math.random() * 6),
      matchesLost: Math.floor(Math.random() * 4),
      gamesWon: Math.floor(Math.random() * 30),
      gamesLost: Math.floor(Math.random() * 25),
      currentStreak: Math.floor(Math.random() * 6) - 3, // -3 to +3
      points: Math.floor(Math.random() * 100),
    },
  }));

  // Create a few sample sessions
  const sampleSessions: Session[] = [
    {
      id: 'session-1',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week ago
      availablePlayers: samplePlayers.slice(0, 16).map(p => p.id),
      matches: [],
      status: 'completed',
      tiers: {
        strong: samplePlayers.slice(0, 8).map(p => p.id),
        weak: samplePlayers.slice(8, 16).map(p => p.id),
      },
    },
    {
      id: 'session-2',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
      availablePlayers: samplePlayers.slice(2, 18).map(p => p.id),
      matches: [],
      status: 'completed',
      tiers: {
        strong: samplePlayers.slice(2, 10).map(p => p.id),
        weak: samplePlayers.slice(10, 18).map(p => p.id),
      },
    },
  ];

  const sampleMatches: Match[] = [];

  return {
    players: samplePlayers,
    matches: sampleMatches,
    sessions: sampleSessions,
  };
}
