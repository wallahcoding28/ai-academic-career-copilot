import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  GitFork,
  MessageSquareQuote,
  CalendarDays,
  History,
  Settings,
  GraduationCap,
  Activity,
  RotateCw,
  X,
  User
} from 'lucide-react';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  stage?: number;
  isAvailable: boolean;
  tag?: string;
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    stage: 1,
    isAvailable: true,
  },
  {
    name: 'Resume Analyzer',
    path: '/resume-analyzer',
    icon: FileText,
    stage: 2,
    isAvailable: true,
  },
  {
    name: 'Skill Gap Analysis',
    path: '/skill-gap',
    icon: GitFork,
    stage: 3,
    isAvailable: true,
  },
  {
    name: 'Interview Generator',
    path: '/interview-generator',
    icon: MessageSquareQuote,
    stage: 4,
    isAvailable: true,
  },
  {
    name: 'Study Planner',
    path: '/study-planner',
    icon: CalendarDays,
    stage: 5,
    isAvailable: true,
  },
  {
    name: 'History',
    path: '/history',
    icon: History,
    isAvailable: true,
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
    stage: 1,
    isAvailable: true,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { state: apiState, latencyMs, checkNow } = useBackendStatus();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-4 h-4 text-slate-100" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-tight tracking-tight">
                AI Copilot
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                Academic & Career
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Core Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose()}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {item.tag && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-normal transition-colors shrink-0 ${
                          isActive
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                        }`}
                      >
                        {item.tag}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Section: API Status & Student Profile */}
        <div className="p-3 border-t border-slate-100 space-y-2.5 bg-slate-50/50">
          {/* Student Profile Card */}
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : <User className="w-4 h-4 text-slate-500" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {user?.name || 'Student Profile'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {user?.degree_program || user?.target_role || 'Academic & Career Workspace'}
              </div>
            </div>
          </div>

          {/* Backend Status Indicator */}
          <div className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                {apiState === 'connected' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : apiState === 'checking' ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                )}
              </span>
              <span className="text-slate-700 font-medium truncate">
                {apiState === 'connected'
                  ? 'API Ready'
                  : apiState === 'checking'
                  ? 'Connecting...'
                  : 'Offline'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {apiState === 'connected' && (
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {latencyMs}ms
                </span>
              )}
              <button
                onClick={() => checkNow()}
                title="Ping Backend API"
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
