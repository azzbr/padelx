import React from 'react';
import { useApp, useAppActions } from '../context/AppContext';
import { 
  Home, 
  Users, 
  Shuffle, 
  Play, 
  History, 
  Trophy, 
  Moon, 
  Sun,
  Settings
} from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Navigation({ currentView, onViewChange }: NavigationProps) {
  const { state } = useApp();
  const { updateSettings } = useAppActions();

  const toggleDarkMode = () => {
    updateSettings({
      ...state.settings,
      darkMode: !state.settings.darkMode,
    });
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'matchmaker', label: 'Match Maker', icon: Shuffle },
    { id: 'live', label: 'Live Matches', icon: Play },
    { id: 'history', label: 'History', icon: History },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <img 
                src="/Benefit-New-Logo-Red-edited3.webp" 
                alt="Benefit Logo" 
                className="h-8 w-auto mr-3"
              />
              <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                Padel X Team Maker
              </h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                  >
                    <Icon className="w-4 h-4 mr-2 inline" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Toggle dark mode"
            >
              {state.settings.darkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <div className="grid grid-cols-3 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`nav-link text-center flex flex-col items-center py-2 text-xs ${
                      isActive ? 'nav-link-active' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
