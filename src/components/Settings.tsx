import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useAppActions } from '../context/AppContext';
import { ArrowLeft, Save, RotateCcw, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'react-toastify';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useApp();
  const { updateSettings } = useAppActions();

  const [formData, setFormData] = useState({
    gamesToWin: state.settings.gamesToWin,
    courtsAvailable: [...state.settings.courtsAvailable],
    darkMode: state.settings.darkMode,
  });

  const [newCourt, setNewCourt] = useState('');

  const handleSave = () => {
    updateSettings(formData);
    toast.success('Settings saved successfully!');
  };

  const handleReset = () => {
    setFormData({
      gamesToWin: 6,
      courtsAvailable: ['A', 'B', 'C', 'D'],
      darkMode: false,
    });
    toast.info('Settings reset to defaults');
  };

  const addCourt = () => {
    if (newCourt.trim() && !formData.courtsAvailable.includes(newCourt.trim())) {
      setFormData(prev => ({
        ...prev,
        courtsAvailable: [...prev.courtsAvailable, newCourt.trim()]
      }));
      setNewCourt('');
    }
  };

  const removeCourt = (court: string) => {
    setFormData(prev => ({
      ...prev,
      courtsAvailable: prev.courtsAvailable.filter(c => c !== court)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Configure your padel match preferences
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Defaults</span>
            </button>

            <button
              onClick={handleSave}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Save className="w-5 h-5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Game Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <SettingsIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Game Settings
              </h2>
            </div>

            <div className="space-y-6">
              {/* Games to Win */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Games to Win
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.gamesToWin}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      gamesToWin: parseInt(e.target.value) || 6
                    }))}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    First team to reach this many games wins the match
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Current: {state.settings.gamesToWin} | Default: 6
                </p>
              </div>
            </div>
          </div>

          {/* Court Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <SettingsIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Court Settings
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available Courts
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.courtsAvailable.map((court) => (
                    <div
                      key={court}
                      className="flex items-center space-x-2 bg-indigo-100 dark:bg-indigo-900 px-3 py-1 rounded-lg"
                    >
                      <span className="text-indigo-800 dark:text-indigo-200 font-medium">
                        Court {court}
                      </span>
                      <button
                        onClick={() => removeCourt(court)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add court (e.g., A, B, C)"
                    value={newCourt}
                    onChange={(e) => setNewCourt(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCourt()}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={addCourt}
                    disabled={!newCourt.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Court
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <SettingsIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Appearance
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Dark Mode
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Toggle between light and dark themes
                  </p>
                </div>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, darkMode: !prev.darkMode }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.darkMode ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Settings Information
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Changes to "Games to Win" will apply to new matches only</li>
              <li>• Existing live matches will continue with their original settings</li>
              <li>• Court changes will be reflected in the next match creation</li>
              <li>• Settings are automatically saved to your browser's local storage</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
