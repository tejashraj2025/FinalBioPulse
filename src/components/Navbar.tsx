import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Database, 
  Layers, 
  Stethoscope, 
  Sun, 
  Moon,
  Bot
} from 'lucide-react';
import { motion } from 'framer-motion';
import { HealthStatus } from '../types';

interface NavbarProps {
  activeTab: 'analyze' | 'audit' | 'simulator' | 'architecture' | 'copilot';
  setActiveTab: (tab: 'analyze' | 'audit' | 'simulator' | 'architecture' | 'copilot') => void;
  health: HealthStatus | null;
  casesCount: number;
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  hasRunAnalysis: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  health,
  casesCount,
  theme,
  toggleTheme,
  isDarkMode,
  onToggleDarkMode,
  hasRunAnalysis,
}) => {
  const isDark = isDarkMode ?? (theme === 'dark');
  const handleToggle = onToggleDarkMode ?? toggleTheme ?? (() => {});

  const tabs = [
    { id: 'analyze' as const, label: 'Analyze', icon: Stethoscope },
    { id: 'audit' as const, label: 'Audit Log', icon: Database, badge: (casesCount ?? 0) > 0 ? casesCount : undefined },
    { id: 'copilot' as const, label: 'Copilot RAG', icon: Bot },
    { id: 'simulator' as const, label: 'Attack Simulator', icon: ShieldCheck },
    { id: 'architecture' as const, label: 'Architecture', icon: Layers },
  ];

  const isMeshLive = hasRunAnalysis && health?.status === 'healthy';

  return (
    <header className="sticky top-0 z-50 ios-glass ios-specular border-b border-slate-200/60 dark:border-white/10 transition-colors">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Logo & Brand */}
        <motion.div 
          onClick={() => setActiveTab('analyze')} 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group flex-shrink-0"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-900 via-teal-900 to-teal-600 dark:from-slate-800 dark:via-teal-800 dark:to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-900/15 dark:shadow-teal-500/15 group-hover:shadow-teal-500/30 transition-all duration-300 border border-white/20 dark:border-white/15">
              <Activity className="w-5 h-5 text-teal-300 animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">BioPulse</span>
              <span className="px-1.5 py-0.2 text-[9px] font-bold tracking-wider uppercase rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 dark:border-teal-400/20">
                Mesh
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block">
              Deterministic Pharmacovigilance
            </p>
          </div>
        </motion.div>

        {/* Center iOS Navigation Bar (Liquid Glass Pill) */}
        <nav className="flex items-center p-1 bg-slate-200/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-300/40 dark:border-white/10 shadow-inner overflow-x-auto max-w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.95 }}
                className={`relative px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-150 flex items-center gap-1.5 select-none whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBackground"
                    className="absolute inset-0 bg-white/95 dark:bg-slate-750/90 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] border border-white/80 dark:border-white/15"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className={`${isActive ? 'inline' : 'hidden md:inline'}`}>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold transition-colors ${
                      isActive 
                        ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200' 
                        : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </span>
              </motion.button>
            );
          })}
        </nav>

        {/* Right Section: Status Indicator & Dark/Light Mode Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Live Mesh Status Indicator: Turns green/active AFTER a real analysis has run */}
          <div 
            id="mesh-status-indicator"
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/70 dark:border-white/10 text-xs shadow-xs"
          >
            <span className="relative flex h-2 w-2">
              {isMeshLive ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs shadow-emerald-500" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400 dark:bg-slate-500" />
              )}
            </span>
            <span className={`font-medium ${isMeshLive ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
              {isMeshLive ? 'XGBoost Active' : 'Mesh Standby'}
            </span>
          </div>

          {/* Sun / Moon Theme Toggle */}
          <motion.button
            id="theme-toggle-btn"
            onClick={handleToggle}
            whileTap={{ scale: 0.9 }}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className="p-2 sm:p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-md transition-colors flex items-center justify-center cursor-pointer"
          >
            <motion.div
              key={isDark ? 'dark' : 'light'}
              initial={{ rotate: -45, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 45, scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </motion.div>
          </motion.button>
        </div>
      </div>
    </header>
  );
};

