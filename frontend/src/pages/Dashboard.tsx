import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  GitFork,
  MessageSquareQuote,
  CalendarDays,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Clock,
  CheckCircle2,
  FileCheck,
  Check,
} from 'lucide-react';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { fetchResumeHistory } from '../services/api';
import { ResumeRecord } from '../types';

export const Dashboard: React.FC = () => {
  const { state: apiState, latencyMs } = useBackendStatus();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      try {
        const res = await fetchResumeHistory();
        if (isMounted && res.ok && res.data) {
          setResumes(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch resume history for dashboard:', err);
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  const latestResume: ResumeRecord | undefined = resumes[0];

  const getTargetRole = (rec: ResumeRecord): string => {
    if (rec.feedback?.target_role) return rec.feedback.target_role;
    const match = rec.feedback?.summary?.match(/competencies for ([\w\s]+) with/i);
    if (match && match[1]) return match[1].trim();
    return 'Full Stack Developer';
  };

  const getScoreRating = (score: number) => {
    if (score >= 75) {
      return {
        label: 'Strong Match',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        barColor: 'bg-emerald-500',
      };
    }
    if (score >= 55) {
      return {
        label: 'Competitive',
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-200/80',
        barColor: 'bg-amber-500',
      };
    }
    return {
      label: 'Needs Revision',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
      barColor: 'bg-rose-500',
    };
  };

  const getFileFormatBadge = (filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase() || 'TXT';
    if (ext === 'PDF') {
      return { text: 'PDF', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (ext === 'DOCX' || ext === 'DOC') {
      return { text: 'DOCX', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    return { text: 'TXT', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. Workspace Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Career &amp; Academic Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Central workspace for resume readiness, engineering career preparation, and academic progress.
          </p>
        </div>

        {/* Inline Telemetry Status */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs text-xs">
          <span className="relative flex h-2 w-2">
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
          <span className="font-medium text-slate-700">
            {apiState === 'connected'
              ? `API & SQLite Operational (${latencyMs}ms)`
              : apiState === 'checking'
              ? 'Connecting to API...'
              : 'API Offline'}
          </span>
        </div>
      </section>

      {/* 2. Active Summary / Overview (3-Column Bento Grid) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Active Engine Spotlight */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
                <Sparkles className="w-4 h-4 text-slate-700" />
              </div>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                Active
              </span>
            </div>
            <h2 className="text-base font-semibold text-slate-900">AI Resume Diagnostics</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Deterministic ATS compatibility evaluation, keyword coverage, and Google X-Y-Z bullet rewrites are active.
            </p>
          </div>
          <Link
            to="/resume-analyzer"
            className="text-blue-600 font-semibold text-xs hover:underline inline-flex items-center gap-1 mt-5 group"
          >
            <span>Launch Resume Analyzer</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Card 2: Latest Evaluation Summary (Real Data Binding) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-400 py-6">
              Loading recent evaluation...
            </div>
          ) : latestResume ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Latest Assessment
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px] border border-slate-200">
                    <FileText className="w-3 h-3 text-slate-500" />
                    <span className="truncate max-w-[140px]">{latestResume.filename}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Target Role</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {getTargetRole(latestResume)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 text-xs font-medium">
                    <span className="text-slate-500">ATS Readiness Score</span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums">
                      {Math.round(latestResume.score)} / 100 •{' '}
                      <span className={getScoreRating(latestResume.score).badgeClass.split(' ')[1]}>
                        {getScoreRating(latestResume.score).label}
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        getScoreRating(latestResume.score).barColor
                      }`}
                      style={{ width: `${Math.min(100, Math.round(latestResume.score))}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>Evaluated: {latestResume.created_at}</span>
                </div>
              </div>

              <Link
                to="/history"
                className="text-blue-600 font-semibold text-xs hover:underline inline-flex items-center gap-1 mt-5 group"
              >
                <span>View Full Diagnostic Audit</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Latest Assessment
                  </span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-medium border border-slate-200">
                    No Audits Stored
                  </span>
                </div>
                <h2 className="text-base font-semibold text-slate-900">Establish Career Baseline</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload your first resume in the Resume Analyzer module to generate diagnostic ATS scores and benchmark role alignment.
                </p>
              </div>

              <Link
                to="/resume-analyzer"
                className="text-blue-600 font-semibold text-xs hover:underline inline-flex items-center gap-1 mt-5 group"
              >
                <span>Upload First Resume</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </>
          )}
        </div>

        {/* Card 3: Career Milestone Progression */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Curriculum Roadmap
              </span>
              <span className="text-xs text-slate-500 font-medium">4 of 4 Stages Ready</span>
            </div>
            <h2 className="text-base font-semibold text-slate-900">Career Milestone Progression</h2>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between text-slate-800">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="font-medium">1. Resume Optimization</span>
                </span>
                <span className="text-xs text-emerald-700 font-semibold">Active / Ready</span>
              </li>
              <li className="flex items-center justify-between text-slate-800">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="font-medium">2. Technical Skill Gap Benchmark</span>
                </span>
                <span className="text-xs text-emerald-700 font-semibold">Active / Ready</span>
              </li>
              <li className="flex items-center justify-between text-slate-800">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="font-medium">3. Role-Targeted Interview Prep</span>
                </span>
                <span className="text-xs text-emerald-700 font-semibold">Active / Ready</span>
              </li>
              <li className="flex items-center justify-between text-slate-800">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="font-medium">4. Examination &amp; Revision Planning</span>
                </span>
                <span className="text-xs text-emerald-700 font-semibold">Active / Ready</span>
              </li>
            </ul>
          </div>

          {/* 4-step segmented bar */}
          <div className="grid grid-cols-4 gap-1.5 mt-4">
            <div className="h-1.5 bg-emerald-500 rounded-full" title="Resume Optimization Active"></div>
            <div className="h-1.5 bg-emerald-500 rounded-full" title="Skill Gap Benchmark Active"></div>
            <div className="h-1.5 bg-emerald-500 rounded-full" title="Interview Prep Active"></div>
            <div className="h-1.5 bg-emerald-500 rounded-full" title="Study Planning Active"></div>
          </div>
        </div>
      </section>

      {/* 3. Core Modules Launchpad (2x2 Grid) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-lg font-bold text-slate-900">Core Modules Launchpad</h2>
          <span className="text-xs text-slate-500">Integrated suite for university-to-workplace readiness</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Module 1: Resume Analyzer (Active) */}
          <div className="border border-slate-900/30 ring-1 ring-slate-900/5 bg-white p-6 rounded-xl shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Resume Analyzer</h3>
                </div>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload student resumes (PDF, DOCX, TXT) or paste raw text. Generates ATS compatibility scoring, section formatting audits, target keyword alignment, and Google X-Y-Z quantified bullet rewrites.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-mono text-[10px] font-semibold border border-slate-200">
                  PDF
                </span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-mono text-[10px] font-semibold border border-slate-200">
                  DOCX
                </span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-mono text-[10px] font-semibold border border-slate-200">
                  TXT
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/resume-analyzer"
                className="bg-slate-900 text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-xs hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
              >
                <span>Open Resume Analyzer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Module 2: Skill Gap Analysis */}
          <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <GitFork className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Skill Gap Analysis</h3>
                </div>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Benchmark current technical coursework and competencies against standardized engineering roles to identify critical missing libraries and architectures.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/skill-gap"
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold py-2.5 px-4 rounded-lg inline-flex items-center gap-2 shadow-xs transition-colors"
              >
                <span>Launch Skill Gap Analyzer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Module 3: AI Interview Generator */}
          <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <MessageSquareQuote className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">AI Interview Generator</h3>
                </div>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Synthesize role-specific technical, data structures &amp; algorithms, system architecture, and behavioral interview question sets calibrated by internship and graduate difficulty levels.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/interview-generator"
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold py-2.5 px-4 rounded-lg inline-flex items-center gap-2 shadow-xs transition-colors"
              >
                <span>Launch Interview Generator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Module 4: AI Study Planner */}
          <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">AI Study Planner</h3>
                </div>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate balanced examination revision schedules distributing subject weights, difficult topics, and spaced repetition buffers around concrete university semester deadlines.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/study-planner"
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold py-2.5 px-4 rounded-lg inline-flex items-center gap-2 shadow-xs transition-colors"
              >
                <span>Launch Study Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Student Career Preparation Pipeline (4-Step Horizontal Progression) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">Student Career Preparation Pipeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cohesive 4-step workflow connecting academic learning to industry career placement
          </p>
        </div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-5 left-8 right-8 h-0.5 bg-slate-200 z-0"></div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
            {/* Step 01: Active */}
            <div className="border border-slate-900/30 bg-slate-50/70 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-900 font-bold bg-white border border-slate-200 px-2 py-0.5 rounded">
                  01
                </span>
                <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>Active</span>
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Resume Optimization</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Diagnostic ATS parsing &amp; quantified bullet refinement
              </p>
            </div>

            {/* Step 02: Active */}
            <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                  02
                </span>
                <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>Active</span>
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Skill Gap Benchmark</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Compare tech stack with industry role requirements
              </p>
            </div>

            {/* Step 03: Active */}
            <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                  03
                </span>
                <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>Active</span>
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Role Interview Prep</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Practice technical questions and behavioral rubrics
              </p>
            </div>

            {/* Step 04: Active */}
            <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                  04
                </span>
                <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>Active</span>
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Revision Planning</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Workload-balanced study schedules for finals
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Recent Activity / Resume Archive (Real Data Binding) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Resume Evaluations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluations saved in local SQLite archive (bound to{' '}
              <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-700">
                GET /api/resume/history
              </code>
              )
            </p>
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoadingHistory ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Loading recent evaluations from database...
          </div>
        ) : resumes.length > 0 ? (
          <>
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Target Role</th>
                    <th className="py-3 px-4">ATS Score</th>
                    <th className="py-3 px-4">Skills Covered</th>
                    <th className="py-3 px-4">Evaluated Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumes.slice(0, 4).map((rec) => {
                    const formatBadge = getFileFormatBadge(rec.filename);
                    const scoreRating = getScoreRating(rec.score);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-[10px] px-1.5 py-0.5 rounded border font-semibold ${formatBadge.badgeClass}`}
                            >
                              {formatBadge.text}
                            </span>
                            <span className="font-mono text-slate-900 font-medium truncate max-w-[180px]">
                              {rec.filename}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {getTargetRole(rec)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 rounded-full font-medium ${scoreRating.badgeClass}`}
                          >
                            <span className="font-bold tabular-nums">
                              {Math.round(rec.score)}/100
                            </span>
                            <span>{scoreRating.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono tabular-nums">
                          {rec.extracted_skills.length} skills
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {rec.created_at}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to="/history"
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            Inspect Audit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400">
              Showing {Math.min(4, resumes.length)} of {resumes.length} parsed evaluations from local database.
            </p>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-3 shadow-2xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              No Resume Evaluations Found
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-4">
              You have not evaluated any resumes yet. Upload a resume in the Resume Analyzer module to establish your career baseline.
            </p>
            <Link
              to="/resume-analyzer"
              className="bg-slate-900 text-white text-xs font-semibold py-2 px-3.5 rounded-lg shadow-xs hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Upload Resume Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* 6. Compact System Telemetry Footer */}
      <footer className="py-2 text-center">
        <p className="text-xs text-slate-400 font-mono">
          API &amp; SQLite Operational • Latency: {latencyMs}ms • Connected to local database
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
