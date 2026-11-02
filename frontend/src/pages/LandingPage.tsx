import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  FileText,
  GitFork,
  MessageSquareQuote,
  CalendarDays,
  History,
  CheckCircle2,
  TrendingUp,
  Lock,
  Menu,
  X,
  GraduationCap,
  Info,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased overflow-x-hidden transition-colors duration-150">
      {/* 1. PUBLIC NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="CareerCopilot Home"
          >
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                CareerCopilot
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded">
                  Academic &amp; Career
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600 dark:text-slate-300" aria-label="Public navigation">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
              How It Works
            </a>
            <a href="#progress" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
              Progress &amp; Value
            </a>
            <a href="#modules" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
              Platform Modules
            </a>
          </nav>

          {/* Top-Right Action Buttons: Theme Toggle, Log In & Get Started */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" /> : <Moon className="w-4 h-4 text-slate-600" aria-hidden="true" />}
            </button>

            <Link
              to="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <span>Get started</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Mobile Menu Bar: Theme Toggle, Log In & Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" /> : <Moon className="w-4 h-4 text-slate-600" aria-hidden="true" />}
            </button>
            <Link
              to="/login"
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 rounded-lg"
            >
              Log in
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div id="mobile-nav-drawer" className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-3">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white py-1.5"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white py-1.5"
            >
              How It Works
            </a>
            <a
              href="#progress"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white py-1.5"
            >
              Progress &amp; Value
            </a>
            <a
              href="#modules"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white py-1.5"
            >
              Platform Modules
            </a>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm"
              >
                Get started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 dark:bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[250px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            {/* Audience Positioning Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-medium mb-6">
              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>Engineered for Students &amp; Aspirants Preparing for Technical Careers</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight sm:leading-none">
              Bridge the Gap from Coursework to Placement with{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 dark:from-indigo-400 dark:via-violet-300 dark:to-indigo-200">
                Verifiable Readiness.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
              An intelligent, academic-grade career copilot that evaluates your technical resume against structured career-readiness reference profiles, uncovers critical skill gaps, synthesizes calibrated interview practice, and organizes structured study roadmaps.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800/90 border border-slate-300 dark:border-slate-800 rounded-xl transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 shadow-xs"
              >
                Explore Features
              </a>
            </div>

            {/* Verified Architectural Trust Indicators */}
            <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Zero Plaintext Passwords</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                <span>Isolated Private Snapshots</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
                <span>Dual-Engine Offline Fallbacks</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                <span>Mathematical 65/35 Weighting</span>
              </div>
            </div>
          </div>

          {/* Product Mockup Preview — Explicitly Labeled as Illustrative Example */}
          <div className="mt-14 max-w-5xl mx-auto rounded-2xl p-2 sm:p-3 bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/20 border border-slate-300 dark:border-slate-800 shadow-xl dark:shadow-2xl">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
              {/* Window Header with Explicit Sample Label */}
              <div className="px-4 py-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" aria-hidden="true"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" aria-hidden="true"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" aria-hidden="true"></span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono ml-2">app.careercopilot.local &bull; Illustrative UI Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 flex items-center gap-1">
                    <Info className="w-3 h-3 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                    Illustrative preview — example data
                  </span>
                </div>
              </div>

              {/* Mockup Dashboard Content Grid */}
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Resume Analysis Snapshot */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" /> Resume Audit
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold text-[11px]">
                      Sample Score: 84%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Sample parse: 14 technical skills extracted from <span className="text-slate-800 dark:text-slate-300 font-mono">sample_resume.pdf</span>. 5 standard sections detected.
                  </p>
                  <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold block text-[10px] uppercase tracking-wider">
                      Sample X-Y-Z Bullet Rewrite:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 italic">
                      &ldquo;Engineered full-stack services using React and Flask, optimizing API throughput and reducing latency across high-volume workloads.&rdquo;
                    </span>
                  </div>
                </div>

                {/* Card 2: Skill Gap Benchmark */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <GitFork className="w-4 h-4 text-violet-600 dark:text-violet-400" aria-hidden="true" /> Full Stack Gap
                    </span>
                    <span className="px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 font-bold text-[11px]">
                      68% Match
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Core Skills (65% wt)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">5 / 6 Matched</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[83%] rounded-full"></div>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-1">
                      <span>Complementary (35% wt)</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">2 / 4 Matched</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[50%] rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Priority additions: <span className="text-rose-600 dark:text-rose-400 font-medium">Docker, CI/CD Pipeline</span>
                  </div>
                </div>

                {/* Card 3: Paced Study Roadmap */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> 4-Week Study Plan
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                      2.5 hrs/day
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Calibrated for Containerization &amp; DevOps with 2 weekly rest days.
                  </p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-300 truncate">Day 8: Practice Dockerfile creation</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-2">&check; Done</span>
                    </div>
                    <div className="p-2 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-between">
                      <span className="text-indigo-900 dark:text-indigo-200 truncate font-medium">Day 9: Multi-stage container builds</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold shrink-0 ml-2">Up Next</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informational Disclaimer Caption */}
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-500 text-center">
                *Illustrative interface preview displaying sample candidate profile data. Actual analysis results are generated from your uploaded documents.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PLATFORM CAPABILITIES SECTION */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 scroll-mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Five Integrated Modules</span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Genuine Software Capabilities Built for Students
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Each module performs a concrete task with verified algorithms, dual-engine AI fallback, and immutable SQLite persistence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="modules">
            {/* Feature 1: Resume Analyzer */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">1. AI Resume Analyzer</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Diagnostic parsing of PDF, DOCX, and TXT resumes. Evaluates 5 standard resume sections, checks keyword density, quantifies metrics, and generates bullet-level rewrites using the Google X-Y-Z formula.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">ATS Compatibility</span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">X-Y-Z Bullet Upgrades</span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">Hard Skill Parsing</span>
              </div>
            </div>

            {/* Feature 2: Skill Gap Analyzer */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-violet-500/50 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <GitFork className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Skill Gap Analyzer</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Benchmarks student competencies against 6 industry profiles (Full Stack, Frontend, Backend, Machine Learning, DevOps, Data Science). Computes exact coverage with 65% core / 35% complementary weighting.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                <span className="px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">3-State Categorization</span>
                <span className="px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">Mathematical Weighting</span>
                <span className="px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">Curated Benchmarks</span>
              </div>
            </div>

            {/* Feature 3: Interview Question Generator */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquareQuote className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Interview Question Generator</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Generates role-specific viva and technical interview questions calibrated by difficulty tier and focus. Dual-engine architecture combines Gemini prompt synthesis with a curated offline bank of 50+ multi-role technical questions with answer guidance.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">Curated 50+ Question Bank</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">Context Integration</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">Answer Guidelines</span>
              </div>
            </div>

            {/* Feature 4: AI Study Planner */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CalendarDays className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">4. AI Study Planner</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Builds realistic study roadmaps calibrated to your daily available study hours (0.5 to 6.0 hours) and planning horizon (1 to 8 weeks). Features atomic session completion toggling and versioned plan regeneration.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">Workload Constraints</span>
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">Rest Day Cadence</span>
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">Versioned History</span>
              </div>
            </div>

            {/* Feature 5: History & Snapshot Comparison */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all space-y-4 md:col-span-2 lg:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <History className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">5. Progress History &amp; Side-by-Side Comparison</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Never lose an evaluation. Every resume audit, skill gap assessment, interview session, and study schedule is archived. The interactive snapshot comparison engine lets you select any two historical resume versions to compare score deltas and skill set changes over time.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300">
                <span className="px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20">Side-by-Side Snapshots</span>
                <span className="px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20">Score Delta Math</span>
                <span className="px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20">Persistent SQLite Storage</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 border-t border-slate-200 dark:border-slate-800 scroll-mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Streamlined Student Workflow</span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Four Steps to Technical Career Readiness
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              A cohesive, unified pipeline that connects your current coursework to career placement milestones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative space-y-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                01
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Analyze Your Resume</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Upload your PDF or DOCX file. Receive instant ATS scoring, keyword detection, and actionable bullet improvements.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative space-y-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-violet-600 text-white font-bold text-xs flex items-center justify-center">
                02
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Identify Skill Gaps</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Select your target industry role. Discover what core fundamentals and complementary technologies are missing from your profile.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative space-y-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                03
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Practice &amp; Plan Study</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Generate calibrated technical interview questions and construct a daily revision calendar tailored to your exam schedule.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative space-y-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                04
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Track Growth &amp; Compare</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Update your resume as you learn new skills. Compare new snapshots against previous versions to verify measurable growth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PROGRESS & VALUE SECTION */}
      <section id="progress" className="py-20 bg-slate-100/70 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 scroll-mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Measurable Student Growth</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Track Your Evolution Across Semesters with Persistent Snapshots
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Most career platforms give one-off feedback that disappears the moment you close the tab. CareerCopilot preserves your evaluations in a secure, isolated database so you can monitor your growth throughout college.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Side-by-Side Snapshot Comparison</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Directly compare Draft #1 vs Draft #3 to see your ATS score delta and confirmed newly acquired skills.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Strict Multi-User Privacy</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Your resumes and study plans are strictly tied to your account. No data is shared or visible across student accounts.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Complete Data Sovereignty</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      One-click options in Settings to clear activity history or permanently delete your account at any time.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Value Graphic — Explicitly Labeled as Example Comparison */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-md">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Snapshot Comparison Engine</span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 font-bold">
                  Illustrative Sample Delta: +13
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Example Draft 1</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Initial Baseline Resume</div>
                  <div className="text-indigo-600 dark:text-indigo-400 font-bold">Sample Score: 75 / 100</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">4 Verified Skills Extracted</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-500/40 space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Example Draft 2</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Subsequent Revision</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">Sample Score: 88 / 100</div>
                  <div className="text-[11px] text-slate-700 dark:text-slate-300">6 Verified Skills (+2 New Added)</div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 text-[11px] space-y-1">
                <span className="text-slate-600 dark:text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Sample Detected Additions:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-mono">
                    + Docker
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-mono">
                    + TypeScript
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800/60">
                *Illustrative comparison model demonstrating the platform's mathematical delta calculations. Individual score changes and skill differences depend on candidate resume modifications.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FINAL CALL TO ACTION */}
      <section className="py-20 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden transition-colors">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100/50 via-slate-50 to-violet-100/50 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/30 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl space-y-6">
            <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-600/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Start Your Journey to Technical Career Readiness Today
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              Create your private student account to analyze your technical resume, uncover skill gaps, and schedule balanced study plans with verifiable progress.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-7 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <span>Create Student Account</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-7 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 rounded-xl transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Sign In to Existing Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 text-xs text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">CareerCopilot</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                An intelligent student success platform engineered for students and technical career aspirants preparing for software roles.
              </p>
            </div>

            {/* Platform Navigation */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-300 text-xs mb-3 uppercase tracking-wider">Platform</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
                    Core Capabilities
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#progress" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
                    Progress &amp; Snapshots
                  </a>
                </li>
              </ul>
            </div>

            {/* Modules Navigation */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-300 text-xs mb-3 uppercase tracking-wider">Modules</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#modules" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
                    Resume Analyzer
                  </a>
                </li>
                <li>
                  <a href="#modules" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
                    Skill Gap Analyzer
                  </a>
                </li>
                <li>
                  <a href="#modules" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
                    Interview Generator
                  </a>
                </li>
                <li>
                  <a href="#modules" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
                    Study Planner
                  </a>
                </li>
              </ul>
            </div>

            {/* Account & Access */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-300 text-xs mb-3 uppercase tracking-wider">Account Access</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
                    Student Sign In
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:text-indigo-600">
                    Create New Account
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 dark:border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>&copy; {new Date().getFullYear()} AI Academic &amp; Career Copilot. All rights reserved.</p>
            <div className="flex items-center gap-4 text-slate-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-500" aria-hidden="true" /> HTTP-Only Signed Sessions
              </span>
              <span>&bull;</span>
              <span>SQLite Isolated Storage</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
