import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

interface RouteMeta {
  title: string;
  subtitle: string;
  stageBadge: {
    text: string;
    variant: 'active' | 'planned' | 'neutral';
  };
}

const routeTitles: Record<string, RouteMeta> = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Overview of your academic roadmap and career preparation progress',
    stageBadge: { text: 'Active', variant: 'active' },
  },
  '/resume-analyzer': {
    title: 'Resume Analyzer',
    subtitle: 'Evaluate your resume structure, keyword coverage, and role relevance',
    stageBadge: { text: 'Active', variant: 'active' },
  },
  '/skill-gap': {
    title: 'Skill Gap Analysis',
    subtitle: 'Benchmark your current competencies against target industry positions',
    stageBadge: { text: 'Active', variant: 'active' },
  },
  '/interview-generator': {
    title: 'AI Interview Question Generator',
    subtitle: 'Practice role-specific technical, architectural, and behavioral question sets',
    stageBadge: { text: 'Active', variant: 'active' },
  },
  '/study-planner': {
    title: 'AI Study Planner',
    subtitle: 'Construct realistic revision schedules based on subjects and exam dates',
    stageBadge: { text: 'Active', variant: 'active' },
  },
  '/history': {
    title: 'History & Archives',
    subtitle: 'Review previously evaluated resumes, gap reports, and study plans',
    stageBadge: { text: 'Active', variant: 'active' },
  },
  '/settings': {
    title: 'Settings & Diagnostics',
    subtitle: 'Configure student profile preferences and monitor backend connectivity',
    stageBadge: { text: 'Online', variant: 'neutral' },
  },
};

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const currentRouteMeta: RouteMeta = routeTitles[location.pathname] || {
    title: 'AI Academic & Career Copilot',
    subtitle: 'An Intelligent Student Success Platform',
    stageBadge: { text: 'Active', variant: 'active' },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-150">
      {/* Persistent Left Sidebar */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <Header
          title={currentRouteMeta.title}
          subtitle={currentRouteMeta.subtitle}
          stageBadge={currentRouteMeta.stageBadge}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
