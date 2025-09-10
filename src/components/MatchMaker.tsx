import React, { useState } from 'react';
import { useApp, useAppActions } from '../context/AppContext';
import { Player, MatchPreview, MatchmakingMode, Match, Session, Tournament } from '../types';
import { generateMatches, generateMatchesWithDuplicatePrevention, generateId, calculateMatchQuality, getQualityRating, generateTournamentBracket, generateRoundRobinBracket, generateTournamentName } from '../utils/matchmaking';
import {
  Target,
  Dice6,
  Heart,
  Users,
  Shuffle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';

interface MatchMakerProps {
  onViewChange: (view: string) => void;
}

export default function MatchMaker({ onViewChange }: MatchMakerProps) {
  const { state } = useApp();
  const { addMatch, addSession, setCurrentSession, addTournament, setCurrentTournament, updateSettings } = useAppActions();

  const [selectedMode, setSelectedMode] = useState<MatchmakingMode | null>(null);
  const [matchPreview, setMatchPreview] = useState<MatchPreview[] | null>(null);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    gamesToWin: state.settings.gamesToWin,
    courtsAvailable: [...state.settings.courtsAvailable],
  });
  const [newCourt, setNewCourt] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const availablePlayers = state.players.filter(p => p.availability.includes(today));
  const canGenerate = availablePlayers.length >= 4 && availablePlayers.length % 4 === 0;
  const maxPlayers = Math.floor(availablePlayers.length / 4) * 4; // Use largest multiple of 4

  const algorithms = [
    {
      id: 'skill-based' as MatchmakingMode,
      title: 'Skill-Based Tiers',
      description: 'Strong vs Strong, Weak vs Weak - Most competitive matches',
      icon: Target,
      color: 'bg-blue-500',
      recommended: true,
    },
    {
      id: 'random-balanced' as MatchmakingMode,
      title: 'Random Balanced',
      description: 'Random teams with balanced skill distribution',
      icon: Dice6,
      color: 'bg-green-500',
      recommended: false,
    },
    {
      id: 'mixed-tiers' as MatchmakingMode,
      title: 'Mixed Tiers',
      description: 'Each team has one strong + one weak player',
      icon: Heart,
      color: 'bg-purple-500',
      recommended: false,
    },
    {
      id: 'tournament' as MatchmakingMode,
      title: 'Tournament Mode',
      description: 'Single-elimination tournament with balanced brackets',
      icon: Target,
      color: 'bg-purple-600',
      recommended: false,
    },
    {
      id: 'round-robin' as MatchmakingMode,
      title: 'Round-Robin Mode',
      description: 'All teams play each other - points-based scoring system',
      icon: Users,
      color: 'bg-orange-500',
      recommended: false,
    },
  ];

  // Generate matches with selected algorithm
  const handleGenerateMatches = async (mode: MatchmakingMode) => {
    if (!canGenerate) {
      const remainder = availablePlayers.length % 4;
      const needed = remainder === 0 ? 0 : 4 - remainder;
      toast.error(`Need players in multiples of 4 (minimum 4). Currently: ${availablePlayers.length}${needed > 0 ? `, need ${needed} more` : ''}`);
      return;
    }

    setIsGenerating(true);
    setSelectedMode(mode);
    setShuffleCount(1);

    try {
      // Use maximum available players (multiple of 4)
      const playersToUse = availablePlayers.slice(0, maxPlayers);

      if (mode === 'tournament') {
        // Special handling for tournament mode
        const tournamentBracket = generateTournamentBracket(playersToUse);

        // Create tournament
        const tournament: Tournament = {
          id: generateId(),
          name: `Tournament ${new Date().toLocaleDateString()}`,
          type: 'single-elimination',
          status: 'active',
          currentRound: 1,
          totalRounds: tournamentBracket.length,
          players: playersToUse.map(p => p.id),
          bracket: tournamentBracket,
          createdAt: new Date().toISOString(),
        };

        // Add tournament to state
        addTournament(tournament);
        setCurrentTournament(tournament);

        toast.success(`🏆 Tournament created with ${tournamentBracket[0].length} first-round matches!`);

        // Navigate to tournament view
        onViewChange('tournament');
      } else if (mode === 'round-robin') {
        // Special handling for round-robin mode
        const tournamentBracket = generateRoundRobinBracket(playersToUse, 'regular-doubles');

        // Create round-robin tournament
        const tournament: Tournament = {
          id: generateId(),
          name: generateTournamentName(),
          type: 'round-robin',
          roundRobinFormat: 'regular-doubles',
          status: 'active',
          currentRound: 1,
          totalRounds: tournamentBracket.length,
          players: playersToUse.map(p => p.id),
          bracket: tournamentBracket,
          roundRobinStandings: [], // Will be calculated as matches are played
          createdAt: new Date().toISOString(),
        };

        // Add tournament to state
        addTournament(tournament);
        setCurrentTournament(tournament);

        const totalMatches = tournamentBracket.flat().length;
        toast.success(`🎯 Round-Robin Mode created with ${totalMatches} matches across ${tournamentBracket.length} rounds!`);

        // Navigate to tournament view
        onViewChange('tournament');
      } else {
        // Regular matchmaking modes
        const matches = generateMatchesWithDuplicatePrevention(playersToUse, mode);
        setMatchPreview(matches);

        const matchCount = matches.length;
        const courtText = matchCount === 1 ? 'court' : 'courts';
        toast.success(`Generated ${matchCount} match${matchCount > 1 ? 'es' : ''} on ${matchCount} ${courtText} using ${algorithms.find(a => a.id === mode)?.title} with duplicate prevention!`);
      }
    } catch (error) {
      toast.error('Failed to generate matches. Please try again.');
      console.error('Match generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate matches with same algorithm
  const handleRegenerateMatches = () => {
    if (!selectedMode || shuffleCount >= 5) return;

    setIsGenerating(true);
    setShuffleCount(prev => prev + 1);

    try {
      const playersToUse = availablePlayers.slice(0, maxPlayers);
      // Use enhanced matchmaking with duplicate prevention for regeneration too
      const matches = generateMatchesWithDuplicatePrevention(playersToUse, selectedMode);
      setMatchPreview(matches);
      toast.success(`Shuffled again with fresh combinations! (${shuffleCount + 1}/5)`);
    } catch (error) {
      toast.error('Failed to regenerate matches. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate team balance
  const getBalanceInfo = (teamASkill: number, teamBSkill: number) => {
    const difference = Math.abs(teamASkill - teamBSkill);
    
    if (difference <= 5) {
      return { label: 'Perfectly Balanced', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900' };
    } else if (difference <= 10) {
      return { label: 'Good Match', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900' };
    } else {
      return { label: 'Unbalanced', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900' };
    }
  };

  // Confirm and start matches
  const handleConfirmMatches = () => {
    if (!matchPreview || !selectedMode) return;

    try {
      // Create new session
      const session: Session = {
        id: generateId(),
        date: today,
        availablePlayers: availablePlayers.slice(0, maxPlayers).map(p => p.id),
        matches: [],
        status: 'active',
        tiers: {
          strong: [],
          weak: [],
        },
      };

      // Create matches
      const matches: Match[] = matchPreview.map((preview, index) => ({
        id: generateId(),
        sessionId: session.id,
        round: 1,
        court: preview.court,
        status: 'waiting' as const,
        teamA: {
          player1Id: preview.teamA.player1.id,
          player2Id: preview.teamA.player2.id,
          gamesWon: 0,
        },
        teamB: {
          player1Id: preview.teamB.player1.id,
          player2Id: preview.teamB.player2.id,
          gamesWon: 0,
        },
        history: [],
      }));

      // Add matches to session
      session.matches = matches.map(m => m.id);

      // Save to state
      addSession(session);
      matches.forEach(match => addMatch(match));
      setCurrentSession(session);

      toast.success('Matches created successfully! Ready to start playing.');
      
      // Navigate to live matches
      onViewChange('live');
      
    } catch (error) {
      toast.error('Failed to create matches. Please try again.');
      console.error('Match creation error:', error);
    }
  };

  // Reset to algorithm selection
  const handleReset = () => {
    setSelectedMode(null);
    setMatchPreview(null);
    setShuffleCount(0);
  };

  // Settings handlers
  const handleSaveSettings = () => {
    updateSettings({
      ...state.settings,
      gamesToWin: settingsForm.gamesToWin,
      courtsAvailable: settingsForm.courtsAvailable,
    });
    toast.success('Settings saved successfully!');
  };

  const addCourt = () => {
    if (newCourt.trim() && !settingsForm.courtsAvailable.includes(newCourt.trim())) {
      setSettingsForm(prev => ({
        ...prev,
        courtsAvailable: [...prev.courtsAvailable, newCourt.trim()]
      }));
      setNewCourt('');
    }
  };

  const removeCourt = (court: string) => {
    setSettingsForm(prev => ({
      ...prev,
      courtsAvailable: prev.courtsAvailable.filter(c => c !== court)
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Match Maker</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Generate balanced teams using smart algorithms with duplicate prevention
        </p>
      </div>

      {/* Modern Session Settings */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-900/20 rounded-2xl p-6 mb-8 border border-indigo-100 dark:border-gray-700 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
              <SettingsIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Session Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure your match preferences
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 shadow-sm"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {showSettings ? 'Collapse' : 'Expand'}
            </span>
            {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showSettings && (
          <div className="space-y-6">
            {/* Games to Win Section */}
            <div className="bg-white dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Games to Win
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    First team to reach this many games wins the match
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Two-Box Selection */}
                <div className="flex items-center justify-center space-x-4">
                  {/* 4 Games Box */}
                  <button
                    onClick={() => {
                      setSettingsForm(prev => ({ ...prev, gamesToWin: 4 }));
                      updateSettings({
                        ...state.settings,
                        gamesToWin: 4,
                      });
                      toast.success('Games to win set to 4!');
                    }}
                    className={`relative px-8 py-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
                      settingsForm.gamesToWin === 4
                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">4</div>
                      <div className="text-sm font-medium">Games</div>
                    </div>
                    {settingsForm.gamesToWin === 4 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>

                  {/* 6 Games Box */}
                  <button
                    onClick={() => {
                      setSettingsForm(prev => ({ ...prev, gamesToWin: 6 }));
                      updateSettings({
                        ...state.settings,
                        gamesToWin: 6,
                      });
                      toast.success('Games to win set to 6!');
                    }}
                    className={`relative px-8 py-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
                      settingsForm.gamesToWin === 6
                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">6</div>
                      <div className="text-sm font-medium">Games</div>
                    </div>
                    {settingsForm.gamesToWin === 6 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Status Display */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Current: <span className="font-medium text-blue-600 dark:text-blue-400">{state.settings.gamesToWin} games</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Will apply to new matches • Auto-saved
                  </p>
                </div>
              </div>
            </div>

            {/* Available Courts Section - Auto-managed */}
            <div className="bg-white dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <span className="text-xl">🏓</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Available Courts
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Auto-managed based on player count
                  </p>
                </div>
              </div>

              {/* Auto Court Calculation */}
              {(() => {
                const autoCourtsNeeded = Math.floor(availablePlayers.length / 4);
                const autoCourtNames = Array.from({ length: autoCourtsNeeded }, (_, i) =>
                  String.fromCharCode(65 + i) // A, B, C, D...
                );

                return (
                  <div className="space-y-4">
                    {/* Auto-detection Info */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                            <span className="text-lg">🎯</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                              Auto-detected: {autoCourtsNeeded} court{autoCourtsNeeded !== 1 ? 's' : ''} needed
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              Based on {availablePlayers.length} available players
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {availablePlayers.length} ÷ 4 = {autoCourtsNeeded}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Auto Court Display */}
                    {autoCourtsNeeded > 0 ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-3">
                          {autoCourtNames.map((courtName) => (
                            <div
                              key={courtName}
                              className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 px-4 py-3 rounded-xl border border-green-200 dark:border-green-700 shadow-sm"
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                  Court {courtName}
                                </span>
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  Active
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center space-x-1">
                            <span>⚡</span>
                            <span>Courts are automatically managed • No manual setup required</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                          <span className="text-2xl">🏓</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Add at least 4 players to see available courts
                        </p>
                      </div>
                    )}

                    {/* Manual Override Option */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
                      >
                        {showSettings ? 'Hide' : 'Show'} manual court management
                      </button>

                      {showSettings && (
                        <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            ⚠️ Manual court management (not recommended - use auto mode above)
                          </p>
                          <div className="flex space-x-3">
                            <input
                              type="text"
                              placeholder="Enter court name (e.g., A, B, C)"
                              value={newCourt}
                              onChange={(e) => setNewCourt(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addCourt()}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <button
                              onClick={addCourt}
                              disabled={!newCourt.trim()}
                              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Save Settings */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleSaveSettings}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                💾 Save Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Player Count Indicator */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${canGenerate ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
              <Users className={`w-6 h-6 ${canGenerate ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
            <div className="ml-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Available Players: {availablePlayers.length} ({maxPlayers} will be used)
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {canGenerate 
                  ? `Ready to generate ${Math.floor(maxPlayers / 4)} match${Math.floor(maxPlayers / 4) > 1 ? 'es' : ''}!` 
                  : availablePlayers.length < 4 
                    ? `Need at least 4 players (currently: ${availablePlayers.length})`
                    : `Need ${4 - (availablePlayers.length % 4)} more players for balanced teams`
                }
              </p>
            </div>
          </div>
          
          {canGenerate ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-red-500" />
          )}
        </div>

        {!canGenerate && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Tip:</strong> Go to Player Manager to mark more players as available for today.
            </p>
          </div>
        )}
      </div>

      {/* Algorithm Selection or Match Preview */}
      {!matchPreview ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {algorithms.map((algorithm) => {
            const Icon = algorithm.icon;
            return (
              <div key={algorithm.id} className="card p-6 hover:shadow-lg transition-shadow duration-200">
                <div className="text-center">
                  <div className={`inline-flex p-4 rounded-full ${algorithm.color} bg-opacity-10 mb-4`}>
                    <Icon className={`w-8 h-8 ${algorithm.color.replace('bg-', 'text-')}`} />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {algorithm.title}
                    {algorithm.recommended && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        Recommended
                      </span>
                    )}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {algorithm.description}
                  </p>
                  
                  <button
                    onClick={() => handleGenerateMatches(algorithm.id)}
                    disabled={!canGenerate || isGenerating}
                    className={`btn w-full ${
                      canGenerate 
                        ? 'btn-primary' 
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isGenerating && selectedMode === algorithm.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Shuffle className="w-4 h-4 mr-2" />
                        Generate Matches
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {/* Match Preview Header */}
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Match Preview - {algorithms.find(a => a.id === selectedMode)?.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Review the generated matches before confirming
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleRegenerateMatches}
                  disabled={shuffleCount >= 5 || isGenerating}
                  className="btn btn-secondary"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Shuffle className="w-4 h-4 mr-2" />
                  )}
                  Shuffle Again ({Math.max(0, 5 - shuffleCount)} left)
                </button>
                
                <button
                  onClick={handleReset}
                  className="btn btn-secondary"
                >
                  Change Algorithm
                </button>
                
                <button
                  onClick={handleConfirmMatches}
                  className="btn btn-success"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Confirm & Start
                </button>
              </div>
            </div>
          </div>

          {/* Match Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {matchPreview.map((match) => {
              const teamASkill = match.teamA.combinedSkill;
              const teamBSkill = match.teamB.combinedSkill;
              const balance = getBalanceInfo(teamASkill, teamBSkill);
              
              return (
                <div key={match.court} className={`card p-6 border-2 transition-all duration-300 hover:shadow-lg ${
                  balance.label === 'Perfectly Balanced'
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700'
                    : balance.label === 'Good Match'
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-700'
                    : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-700'
                }`}>
                  {/* Enhanced Header with Icon */}
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-2xl">
                        {balance.label === 'Perfectly Balanced' ? '🏆' :
                         balance.label === 'Good Match' ? '⚖️' : '⚠️'}
                      </span>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Court {match.court} - {balance.label}
                      </h4>
                    </div>
                  </div>

                  {/* Enhanced Horizontal Team Layout */}
                  <div className="flex items-center justify-between mb-4">
                    {/* Team A */}
                    <div className="flex-1 text-center">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">Team A</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        ({match.teamA.player1.name} + {match.teamA.player2.name})
                      </div>
                      <div className={`font-bold text-xl px-3 py-1 rounded-lg ${
                        balance.label === 'Perfectly Balanced'
                          ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200'
                          : balance.label === 'Good Match'
                          ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                          : 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200'
                      }`}>
                        {teamASkill}
                      </div>
                    </div>

                    {/* Enhanced VS Divider */}
                    <div className="mx-4">
                      <div className={`px-4 py-2 rounded-full font-bold text-xl ${
                        balance.label === 'Perfectly Balanced'
                          ? 'bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-200'
                          : balance.label === 'Good Match'
                          ? 'bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200'
                          : 'bg-red-200 dark:bg-red-700 text-red-800 dark:text-red-200'
                      }`}>
                        VS
                      </div>
                    </div>

                    {/* Team B */}
                    <div className="flex-1 text-center">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">Team B</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        ({match.teamB.player1.name} + {match.teamB.player2.name})
                      </div>
                      <div className={`font-bold text-xl px-3 py-1 rounded-lg ${
                        balance.label === 'Perfectly Balanced'
                          ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200'
                          : balance.label === 'Good Match'
                          ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                          : 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200'
                      }`}>
                        {teamBSkill}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Skill Difference Badge */}
                  <div className="text-center">
                    <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                      balance.label === 'Perfectly Balanced'
                        ? 'bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-200'
                        : balance.label === 'Good Match'
                        ? 'bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200'
                        : 'bg-red-200 dark:bg-red-700 text-red-800 dark:text-red-200'
                    }`}>
                      Skill Difference: {Math.abs(teamASkill - teamBSkill)} points
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Match Quality Analytics */}
          <div className="card p-6 mt-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Match Quality Analytics</h4>
            
            {(() => {
              const quality = calculateMatchQuality(matchPreview);
              const overallRating = getQualityRating(quality.overallScore);
              const balanceRating = getQualityRating(quality.balanceScore);
              const freshnessRating = getQualityRating(quality.freshnessScore);
              
              return (
                <div className="space-y-6">
                  {/* Overall Quality Score */}
                  <div className="text-center">
                    <div className={`inline-block px-4 py-2 rounded-full ${overallRating.bgColor} ${overallRating.color} mb-2`}>
                      <span className="text-lg font-bold">{quality.overallScore}/100</span>
                      <span className="ml-2 text-sm">{overallRating.text}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Overall Match Quality</p>
                  </div>

                  {/* Detailed Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Balance Metrics */}
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3">Team Balance</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Balance Score:</span>
                          <span className={`font-medium ${balanceRating.color}`}>
                            {quality.balanceScore}/100 ({balanceRating.text})
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Avg Skill Difference:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {quality.details.averageSkillDifference} points
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Freshness Metrics */}
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3">Match Freshness</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Freshness Score:</span>
                          <span className={`font-medium ${freshnessRating.color}`}>
                            {quality.freshnessScore}/100 ({freshnessRating.text})
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Duplicate Prevention:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Match Distribution */}
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">Match Distribution</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {quality.details.perfectlyBalanced}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Perfectly Balanced</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">(≤5 point diff)</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {quality.details.goodMatches}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Good Matches</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">(6-10 point diff)</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {quality.details.unbalanced}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Unbalanced</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">(&gt;10 point diff)</p>
                      </div>
                    </div>
                  </div>

                  {/* Quality Tips */}
                  {quality.overallScore < 75 && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h6 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Tips to Improve Match Quality:</h6>
                      <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                        {quality.balanceScore < 70 && (
                          <li>• Consider adjusting player skill ratings for better balance</li>
                        )}
                        {quality.freshnessScore < 70 && (
                          <li>• Some players have played together recently - try shuffling again</li>
                        )}
                        {quality.details.unbalanced > 0 && (
                          <li>• {quality.details.unbalanced} match{quality.details.unbalanced > 1 ? 'es are' : ' is'} significantly unbalanced</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
