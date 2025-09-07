import React, { useState } from 'react';
import { useApp, useAppActions } from '../context/AppContext';
import { Player } from '../types';
import { generateId } from '../utils/matchmaking';
import { 
  Plus, 
  Users, 
  Edit3, 
  Trash2, 
  UserPlus, 
  Database,
  Calendar,
  CalendarCheck,
  Star,
  UserCheck,
  UserX
} from 'lucide-react';
import { toast } from 'react-toastify';

interface PlayerManagerProps {
  onViewChange: (view: string) => void;
}

export default function PlayerManager({ onViewChange }: PlayerManagerProps) {
  const { state } = useApp();
  const { addPlayer, updatePlayer, deletePlayer, loadSampleData } = useAppActions();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [bulkNames, setBulkNames] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    skill: 50,
    isGuest: false,
    isActive: true,
  });

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Validation
  const validatePlayerName = (name: string): string | null => {
    if (name.length < 2 || name.length > 30) {
      return 'Name must be between 2-30 characters';
    }
    
    if (!/^[a-zA-Z\s\-']+$/.test(name)) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    
    const existingPlayer = state.players.find(p => 
      p.name.toLowerCase() === name.toLowerCase() && 
      (!editingPlayer || p.id !== editingPlayer.id)
    );
    
    if (existingPlayer) {
      return 'A player with this name already exists';
    }
    
    return null;
  };

  // Create new player
  const createPlayer = (name: string, skill: number, isGuest: boolean = false): Player => {
    return {
      id: generateId(),
      name: name.trim(),
      skill,
      isGuest,
      availability: [],
      createdAt: new Date().toISOString(),
      stats: {
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        currentStreak: 0,
        points: 0,
      },
    };
  };

  // Handle single player add
  const handleAddPlayer = () => {
    const nameError = validatePlayerName(formData.name);
    if (nameError) {
      toast.error(nameError);
      return;
    }

    const newPlayer = createPlayer(formData.name, formData.skill, formData.isGuest);
    addPlayer(newPlayer);
    
    toast.success(`Player "${formData.name}" added successfully!`);
    setFormData({ name: '', skill: 50, isGuest: false, isActive: true });
    setShowAddForm(false);
  };

  // Handle bulk add
  const handleBulkAdd = () => {
    const names = bulkNames
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (names.length === 0) {
      toast.error('Please enter at least one player name');
      return;
    }

    let addedCount = 0;
    let errors: string[] = [];

    names.forEach(name => {
      const error = validatePlayerName(name);
      if (error) {
        errors.push(`${name}: ${error}`);
      } else {
        const newPlayer = createPlayer(name, 50, false);
        addPlayer(newPlayer);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      toast.success(`Added ${addedCount} player${addedCount > 1 ? 's' : ''} successfully!`);
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    setBulkNames('');
    setShowBulkAdd(false);
  };

  // Handle guest add
  const handleAddGuest = () => {
    const existingGuests = state.players.filter(p => p.name.startsWith('Guest '));
    const guestNumber = existingGuests.length + 1;
    const guestName = `Guest ${guestNumber}`;
    
    const newPlayer = createPlayer(guestName, 50, true);
    addPlayer(newPlayer);
    
    toast.success(`${guestName} added successfully!`);
  };

  // Handle edit player
  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      skill: player.skill,
      isGuest: player.isGuest,
      isActive: true, // We'll add this field to Player type if needed
    });
    setShowAddForm(true);
  };

  // Handle update player
  const handleUpdatePlayer = () => {
    if (!editingPlayer) return;

    const nameError = validatePlayerName(formData.name);
    if (nameError) {
      toast.error(nameError);
      return;
    }

    const updatedPlayer: Player = {
      ...editingPlayer,
      name: formData.name.trim(),
      skill: formData.skill,
      isGuest: formData.isGuest,
    };

    updatePlayer(updatedPlayer);
    toast.success(`Player "${formData.name}" updated successfully!`);
    
    setEditingPlayer(null);
    setFormData({ name: '', skill: 50, isGuest: false, isActive: true });
    setShowAddForm(false);
  };

  // Handle delete player
  const handleDeletePlayer = (player: Player) => {
    if (window.confirm(`Are you sure you want to delete "${player.name}"?`)) {
      deletePlayer(player.id);
      toast.success(`Player "${player.name}" deleted successfully!`);
    }
  };

  // Toggle availability
  const toggleAvailability = (player: Player, date: string) => {
    const availability = player.availability.includes(date)
      ? player.availability.filter(d => d !== date)
      : [...player.availability, date];
    
    updatePlayer({ ...player, availability });
  };

  // Bulk availability actions
  const markAllAvailable = (date: string) => {
    state.players.forEach(player => {
      if (!player.availability.includes(date)) {
        updatePlayer({ 
          ...player, 
          availability: [...player.availability, date] 
        });
      }
    });
    toast.success(`All players marked available for ${date === today ? 'today' : 'tomorrow'}`);
  };

  const clearAllAvailability = (date: string) => {
    state.players.forEach(player => {
      if (player.availability.includes(date)) {
        updatePlayer({ 
          ...player, 
          availability: player.availability.filter(d => d !== date) 
        });
      }
    });
    toast.success(`All availability cleared for ${date === today ? 'today' : 'tomorrow'}`);
  };

  // Get skill preset
  const getSkillPreset = (level: string) => {
    switch (level) {
      case 'beginner': return 30;
      case 'intermediate': return 50;
      case 'advanced': return 70;
      case 'expert': return 90;
      default: return 50;
    }
  };

  const availableToday = state.players.filter(p => p.availability.includes(today)).length;
  const availableTomorrow = state.players.filter(p => p.availability.includes(tomorrow)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Player Manager</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage players, set skill ratings, and track availability
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Players</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{state.players.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{availableToday}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <CalendarCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Tomorrow</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{availableTomorrow}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <UserPlus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Guest Players</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {state.players.filter(p => p.isGuest).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Player
        </button>
        
        <button
          onClick={() => setShowBulkAdd(true)}
          className="btn btn-secondary"
        >
          <Users className="w-4 h-4 mr-2" />
          Quick Add Multiple
        </button>
        
        <button
          onClick={handleAddGuest}
          className="btn btn-secondary"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Guest
        </button>
        
        <button
          onClick={loadSampleData}
          className="btn btn-secondary"
        >
          <Database className="w-4 h-4 mr-2" />
          Load Sample Players
        </button>
      </div>

      {/* Availability Actions */}
      <div className="card p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bulk Availability Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Today ({availableToday}/16)</h4>
            <div className="flex gap-2">
              <button
                onClick={() => markAllAvailable(today)}
                className="btn btn-success text-sm"
              >
                Mark All Available
              </button>
              <button
                onClick={() => clearAllAvailability(today)}
                className="btn btn-secondary text-sm"
              >
                Clear All
              </button>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Tomorrow ({availableTomorrow}/16)</h4>
            <div className="flex gap-2">
              <button
                onClick={() => markAllAvailable(tomorrow)}
                className="btn btn-success text-sm"
              >
                Mark All Available
              </button>
              <button
                onClick={() => clearAllAvailability(tomorrow)}
                className="btn btn-secondary text-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Player Form */}
      {showAddForm && (
        <div className="card p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingPlayer ? 'Edit Player' : 'Add New Player'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Player Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Enter player name"
                maxLength={30}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                2-30 characters, letters, spaces, hyphens, and apostrophes only
              </p>
            </div>

            <div>
              <label className="label">Skill Rating</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={formData.skill}
                  onChange={(e) => setFormData({ ...formData, skill: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.skill}
                  onChange={(e) => setFormData({ ...formData, skill: parseInt(e.target.value) || 50 })}
                  className="w-20 input"
                />
              </div>
              
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setFormData({ ...formData, skill: getSkillPreset('beginner') })}
                  className="btn btn-secondary text-xs"
                >
                  Beginner (30)
                </button>
                <button
                  onClick={() => setFormData({ ...formData, skill: getSkillPreset('intermediate') })}
                  className="btn btn-secondary text-xs"
                >
                  Intermediate (50)
                </button>
                <button
                  onClick={() => setFormData({ ...formData, skill: getSkillPreset('advanced') })}
                  className="btn btn-secondary text-xs"
                >
                  Advanced (70)
                </button>
                <button
                  onClick={() => setFormData({ ...formData, skill: getSkillPreset('expert') })}
                  className="btn btn-secondary text-xs"
                >
                  Expert (90)
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isGuest}
                onChange={(e) => setFormData({ ...formData, isGuest: e.target.checked })}
                className="mr-2"
              />
              <span className="text-gray-900 dark:text-white">Guest Player</span>
            </label>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={editingPlayer ? handleUpdatePlayer : handleAddPlayer}
              className="btn btn-primary"
            >
              {editingPlayer ? 'Update Player' : 'Add Player'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingPlayer(null);
                setFormData({ name: '', skill: 50, isGuest: false, isActive: true });
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk Add Form */}
      {showBulkAdd && (
        <div className="card p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Add Multiple Players</h3>
          
          <div>
            <label className="label">Player Names (one per line)</label>
            <textarea
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              className="input h-32 resize-none"
              placeholder="Enter player names, one per line:&#10;Salmeen&#10;Nawaf&#10;Khalid&#10;Janahi"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              All players will be added with skill rating 50
            </p>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleBulkAdd}
              className="btn btn-primary"
            >
              Add All Players
            </button>
            <button
              onClick={() => {
                setShowBulkAdd(false);
                setBulkNames('');
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Players List */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Players ({state.players.length})
        </h3>

        {state.players.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No players added yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Add your first player to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Skill</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">Today</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">Tomorrow</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Type</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.players.map((player) => (
                  <tr key={player.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {player.name}
                        </span>
                        {player.isGuest && (
                          <span className="ml-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            GUEST
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="text-gray-900 dark:text-white">{player.skill}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleAvailability(player, today)}
                        className={`p-1 rounded ${
                          player.availability.includes(today)
                            ? 'text-green-600 hover:text-green-700'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {player.availability.includes(today) ? (
                          <UserCheck className="w-5 h-5" />
                        ) : (
                          <UserX className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleAvailability(player, tomorrow)}
                        className={`p-1 rounded ${
                          player.availability.includes(tomorrow)
                            ? 'text-green-600 hover:text-green-700'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {player.availability.includes(tomorrow) ? (
                          <UserCheck className="w-5 h-5" />
                        ) : (
                          <UserX className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        player.isGuest 
                          ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}>
                        {player.isGuest ? 'Guest' : 'Regular'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditPlayer(player)}
                          className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(player)}
                          className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
