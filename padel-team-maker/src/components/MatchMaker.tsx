import React, { useState } from 'react';
import { useApp, useAppActions } from '../context/AppContext';
import { Player, MatchPreview, MatchmakingMode, Match, Session } from '../types';
import { generateMatches, generateMatchesWithDuplicatePrevention, generateId, calculateMatchQuality, getQualityRating } from '../utils/matchmaking';
import { 
  Target, 
  Dice6, 
  Heart, 
  Users, 
  Shuffle, 
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play
} from 'lucide-react';
import { toast } from 'react-toastify';

interface MatchMakerProps {
  onViewChange: (view: string) => void;
}

export default function MatchMaker({ onViewChange }: MatchMakerProps) {
  const { state } = useApp();
  const { addMatch, addSession, setCurrentSession } = useAppActions();
  
  const [selectedMode, setSelectedMode] = useState<MatchmakingMode | null>(null);
  const [matchPreview, setMatchPreview] = useState<MatchPreview[] | null>(null);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

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
      
      // Use enhanced matchmaking with duplicate prevention
      const matches = generateMatchesWithDuplicatePrevention(playersToUse, mode);
      setMatchPreview(matches);
      
      const matchCount = matches.length;
      const courtText = matchCount === 1 ? 'court' : 'courts';
      toast.success(`Generated ${matchCount} match${matchCount > 1 ? 'es' : ''} on ${matchCount} ${courtText} using ${algorithms.find(a => a.id === mode)?.title} with duplicate prevention!`);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Match Maker</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Generate balanced teams using smart algorithms with duplicate prevention
        </p>
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
                <div key={match.court} className="card p-6">
                  <div className="text-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Court {match.court}
                    </h4>
                    <span className={`inline-block px-3 py-1 text-sm rounded-full ${balance.bgColor} ${balance.color}`}>
                      {balance.label}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Team A */}
                    <div className="team-display">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Team A</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {match.teamA.player1.name} + {match.teamA.player2.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {teamASkill}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ({match.teamA.player1.skill} + {match.teamA.player2.skill})
                        </p>
                      </div>
                    </div>

                    {/* VS Divider */}
                    <div className="text-center">
                      <span className="text-gray-400 dark:text-gray-600 font-bold">VS</span>
                    </div>

                    {/* Team B */}
                    <div className="team-display">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Team B</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {match.teamB.player1.name} + {match.teamB.player2.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {teamBSkill}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ({match.teamB.player1.skill} + {match.teamB.player2.skill})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Balance Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Skill Difference:</span>
                      <span className={`font-medium ${balance.color}`}>
                        {Math.abs(teamASkill - teamBSkill)} points
                      </span>
                    </div>
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
