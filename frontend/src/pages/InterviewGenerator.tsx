import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Radar,
  Info,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  fetchInterviewRoles,
  generateInterviewQuestions,
  fetchResumeHistory,
  fetchSkillGapHistory,
  fetchInterviewHistory,
} from '../services/api';
import {
  InterviewRoleSummary,
  InterviewSession,
  InterviewQuestion,
  ResumeRecord,
  SkillGapHistoryRecord,
} from '../types';

export const InterviewGenerator: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlSessionId = searchParams.get('sessionId');

  // Roles and parameters
  const [roles, setRoles] = useState<InterviewRoleSummary[]>([]);
  const [selectedRole, setSelectedRole] = useState('Full Stack Developer');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [questionFocus, setQuestionFocus] = useState<string>('Mixed / Balanced');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [contextSource, setContextSource] = useState<'none' | 'resume' | 'skill_gap'>('skill_gap');

  // Context resources
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [skillGaps, setSkillGaps] = useState<SkillGapHistoryRecord[]>([]);
  const [selectedSkillGapId, setSelectedSkillGapId] = useState<number | null>(null);

  // Execution states
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [expandedGuidance, setExpandedGuidance] = useState<Record<number, boolean>>({ 1: true });
  const [copiedQuestionId, setCopiedQuestionId] = useState<number | null>(null);
  const [savedQuestions, setSavedQuestions] = useState<Record<string, boolean>>({});

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingMeta(true);
      try {
        const [rolesRes, resumesRes, gapsRes, historyRes] = await Promise.all([
          fetchInterviewRoles(),
          fetchResumeHistory(),
          fetchSkillGapHistory(),
          fetchInterviewHistory(),
        ]);

        if (rolesRes.ok && rolesRes.data && rolesRes.data.length > 0) {
          setRoles(rolesRes.data);
          setSelectedRole(rolesRes.data[0].title);
        }

        if (resumesRes.ok && resumesRes.data && resumesRes.data.length > 0) {
          setResumes(resumesRes.data);
          setSelectedResumeId(resumesRes.data[0].id);
        }

        if (gapsRes.ok && gapsRes.data && gapsRes.data.length > 0) {
          setSkillGaps(gapsRes.data);
          setSelectedSkillGapId(gapsRes.data[0].id);
        } else {
          // If no skill gaps yet, default to resume or none
          if (resumesRes.ok && resumesRes.data && resumesRes.data.length > 0) {
            setContextSource('resume');
          } else {
            setContextSource('none');
          }
        }

        // Restore selected session (from URL) or latest session if available in history
        if (historyRes.ok && historyRes.data && historyRes.data.length > 0) {
          const targetSession = urlSessionId
            ? historyRes.data.find((s) => s.id === parseInt(urlSessionId, 10)) || historyRes.data[0]
            : historyRes.data[0];
          setSession({
            id: targetSession.id,
            target_role: targetSession.target_role,
            difficulty: targetSession.difficulty,
            question_focus: targetSession.question_focus,
            selected_skills: targetSession.selected_skills,
            question_count: targetSession.question_count,
            context_source: targetSession.context_source,
            resume_id: targetSession.resume_id,
            skill_gap_id: targetSession.skill_gap_id,
            generation_mode: targetSession.generation_mode,
            generation_mode_label: targetSession.generation_mode_label,
            categories: targetSession.categories,
            questions: targetSession.questions,
            created_at: targetSession.created_at,
          });
          setSelectedRole(targetSession.target_role);
          if (['Beginner', 'Intermediate', 'Advanced'].includes(targetSession.difficulty)) {
            setDifficulty(targetSession.difficulty as any);
          }
          setQuestionFocus(targetSession.question_focus);
          setQuestionCount(targetSession.question_count);
        }

        // Load saved bookmarks from localStorage
        try {
          const stored = localStorage.getItem('copilot_saved_questions');
          if (stored) {
            setSavedQuestions(JSON.parse(stored));
          }
        } catch {
          // Ignore localStorage read errors
        }
      } catch (err: any) {
        console.error('Failed to load interview generator metadata:', err);
      } finally {
        setIsLoadingMeta(false);
      }
    };

    loadInitialData();
  }, [urlSessionId]);

  // Handle generation action
  // Handle generation action
  const handleGenerate = async () => {
    setError(null);

    // Validate context requirements proactively
    if (contextSource === 'skill_gap' && !selectedSkillGapId) {
      setError("No Skill Gap evaluation found on file. Please complete an evaluation in Skill Gap Analysis first, or select 'No Profile Context'.");
      return;
    }
    if (contextSource === 'resume' && !selectedResumeId) {
      setError("No analyzed resume found on file. Please upload a resume in Resume Analyzer first, or select 'No Profile Context'.");
      return;
    }

    setIsGenerating(true);

    try {
      const payload = {
        target_role: selectedRole,
        difficulty,
        question_focus: questionFocus,
        selected_skills: [],
        question_count: questionCount,
        context_source: contextSource,
        resume_id: contextSource === 'resume' ? selectedResumeId : null,
        skill_gap_id: contextSource === 'skill_gap' ? selectedSkillGapId : null,
      };

      const res = await generateInterviewQuestions(payload);
      if (res.ok && res.data) {
        setSession(res.data);
        setActiveCategoryFilter('All');
        setExpandedGuidance({ 1: true });
      } else {
        setError(res.error || 'Failed to generate interview practice questions.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during question generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle guidance expansion
  const toggleGuidance = (qNum: number) => {
    setExpandedGuidance((prev) => ({
      ...prev,
      [qNum]: !prev[qNum],
    }));
  };

  // Copy question text to clipboard
  const handleCopyQuestion = (qNum: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedQuestionId(qNum);
      setTimeout(() => setCopiedQuestionId(null), 2000);
    });
  };

  // Toggle saving to local practice list
  const toggleSaveQuestion = (questionText: string) => {
    setSavedQuestions((prev) => {
      const updated = { ...prev, [questionText]: !prev[questionText] };
      try {
        localStorage.setItem('copilot_saved_questions', JSON.stringify(updated));
      } catch {
        // Ignore localStorage error
      }
      return updated;
    });
  };

  // Helper for category short names in summary filter
  const getCategoryShortLabel = (cat: string) => {
    if (cat.includes('Technical')) return 'Technical';
    if (cat.includes('Coding')) return 'Coding';
    if (cat.includes('System') || cat.includes('Architecture')) return 'Architecture';
    if (cat.includes('Behavioral')) return 'Behavioral';
    return cat.split(' ')[0];
  };

  // Active Skill Gap details
  const activeSkillGap = skillGaps.find((g) => g.id === selectedSkillGapId) || skillGaps[0];
  const activeResume = resumes.find((r) => r.id === selectedResumeId) || resumes[0];

  // Questions filtered by category
  const filteredQuestions = session?.questions
    ? activeCategoryFilter === 'All'
      ? session.questions
      : session.questions.filter((q) => q.category === activeCategoryFilter)
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Workflow Breadcrumb & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold tracking-wider text-slate-400 uppercase">CAREER WORKFLOW</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-600 uppercase tracking-wide">INTERVIEW PREPARATION</span>
        </div>
        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Active System
        </span>
      </div>

      {/* Header & Page Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              AI Interview Question Generator
            </h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Ready
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Generate role-calibrated technical, behavioral, and architectural practice questions with key points to consider and talking points.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/history"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-lg transition-colors shadow-2xs"
          >
            Practice History
          </Link>
        </div>
      </div>

      {/* SECTION 1: Configuration Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Generator Parameters & Calibration
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
            Role Benchmarks Active
          </span>
        </div>

        {/* Row 1: Target Role & Seniority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Target Role Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">Target Role</label>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={isLoadingMeta || isGenerating}
                aria-label="Select target role"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-0 shadow-2xs"
              >
                {roles.length > 0 ? (
                  roles.map((r) => (
                    <option key={r.id} value={r.title}>
                      {r.title}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Frontend Engineer">Frontend Engineer</option>
                    <option value="Backend Engineer">Backend Engineer</option>
                    <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                    <option value="Data Analyst / Scientist">Data Analyst / Scientist</option>
                    <option value="DevOps & Cloud Engineer">DevOps & Cloud Engineer</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Target Seniority Segmented Control */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">Target Seniority / Difficulty</label>
            <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1 text-center text-xs">
              {(
                [
                  { id: 'Beginner', label: 'Beginner (Junior)' },
                  { id: 'Intermediate', label: 'Intermediate (Mid)' },
                  { id: 'Advanced', label: 'Advanced (Senior)' },
                ] as const
              ).map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setDifficulty(lvl.id)}
                  disabled={isGenerating}
                  className={`py-1.5 rounded-md transition-all font-medium ${
                    difficulty === lvl.id
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Question Focus & Distribution */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-800 block">
            Question Focus & Distribution
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              'Mixed / Balanced',
              'Technical Fundamentals',
              'Coding & Algorithms',
              'System Design & Architecture',
              'Behavioral & Project Experience',
            ].map((focus) => {
              const isSelected = questionFocus === focus;
              return (
                <button
                  key={focus}
                  type="button"
                  onClick={() => setQuestionFocus(focus)}
                  disabled={isGenerating}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  <span>{focus}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Included Core Topics / Calibrated Tags */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800">
              Calibrated Topics for {selectedRole}
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              Calibrated by Role Benchmarks
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {/* Dynamic Benchmark Skills for Selected Role */}
            {(roles.find((r) => r.title === selectedRole)?.core_skills || [
              'Core Architecture',
              'Data Structures',
              'System Design',
              'APIs & Protocols',
            ])
              .slice(0, 6)
              .map((skill) => (
                <span
                  key={skill}
                  className="bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md text-[11px]"
                >
                  {skill}
                </span>
              ))}

            {/* Targeted Skill Gap Tags (Data Driven) */}
            {contextSource === 'skill_gap' &&
              activeSkillGap?.missing_skills?.slice(0, 2).map((s) => (
                <span
                  key={s.name}
                  className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1"
                >
                  <Radar className="w-3 h-3 text-blue-600" />
                  {s.name} (Targeted Gap)
                </span>
              ))}
          </div>
        </div>

        {/* Row 4: Count & Context Source Selection */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800">
              Context Source & Question Volume
            </label>
            {/* Question Count Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Question Count:</span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-mono text-xs">
                {[5, 10, 15, 20].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    disabled={isGenerating}
                    className={`px-2.5 py-0.5 rounded-md transition-all font-medium ${
                      questionCount === cnt
                        ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Radio Source Selection Cards (Data Driven) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Option A: Skill Gap Analysis */}
            <label
              className={`relative flex flex-col justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                contextSource === 'skill_gap'
                  ? 'border-blue-600 bg-blue-50/20 shadow-2xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="context_source"
                    value="skill_gap"
                    checked={contextSource === 'skill_gap'}
                    onChange={() => setContextSource('skill_gap')}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-slate-900">Skill Gap Analysis</span>
                </div>
                {activeSkillGap ? (
                  <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 tabular-nums">
                    {Math.round(activeSkillGap.match_percentage)}% Match
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                    None yet
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                {activeSkillGap && activeSkillGap.missing_skills?.length > 0
                  ? `Focusing on: ${activeSkillGap.missing_skills.slice(0, 2).map((s) => s.name).join(', ')}`
                  : activeSkillGap
                  ? `Evaluated for ${activeSkillGap.target_role}`
                  : 'Run a Skill Gap evaluation to enable targeted practice.'}
              </p>
            </label>

            {/* Option B: Analyzed Resume */}
            <label
              className={`relative flex flex-col justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                contextSource === 'resume'
                  ? 'border-blue-600 bg-blue-50/20 shadow-2xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="context_source"
                    value="resume"
                    checked={contextSource === 'resume'}
                    onChange={() => setContextSource('resume')}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-slate-900">Analyzed Resume</span>
                </div>
                {activeResume ? (
                  <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 tabular-nums">
                    {activeResume.score} ATS
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                    None yet
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 truncate font-mono">
                {activeResume ? activeResume.filename : 'Upload a resume to calibrate by experience.'}
              </p>
            </label>

            {/* Option C: No Profile Context */}
            <label
              className={`relative flex flex-col justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                contextSource === 'none'
                  ? 'border-blue-600 bg-blue-50/20 shadow-2xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="context_source"
                    value="none"
                    checked={contextSource === 'none'}
                    onChange={() => setContextSource('none')}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-slate-900">No Profile Context</span>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                  Standard
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Industry-standard benchmark questions based on role and level.
              </p>
            </label>
          </div>
        </div>

        {/* Action Row */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Calibrated against standard software engineering leveling rubrics and role benchmarks.</span>
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Calibrating Questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Generate Practice Questions</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between gap-3 text-red-800">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold block">Generation Error</span>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="text-xs font-semibold text-red-700 underline hover:text-red-900 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isGenerating && (
        <div className="space-y-4 animate-pulse">
          <div className="bg-white border border-slate-200 rounded-xl p-4 h-12"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-32"></div>
                <div className="h-4 bg-slate-200 rounded w-24"></div>
              </div>
              <div className="h-5 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-100 rounded w-3/4"></div>
              <div className="h-16 bg-slate-50 border border-slate-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      )}

      {/* RESULTS CANVAS (Data-driven) */}
      {!isGenerating && session && session.questions && session.questions.length > 0 && (
        <div className="space-y-4">
          {/* SECTION 2: Active Question Set Summary Bar */}
          <section className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-md font-medium">
                Role: {session.target_role}
              </span>
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-md font-medium">
                Difficulty: {session.difficulty}
              </span>
              <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-md font-medium tabular-nums">
                Count: {session.questions.length} Questions
              </span>
              <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-md font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Context:{' '}
                {session.context_source === 'skill_gap'
                  ? 'Skill Gap Benchmark'
                  : session.context_source === 'resume'
                  ? 'Analyzed Resume'
                  : 'Standard Profile'}
              </span>
              <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md font-mono text-[11px]">
                {session.generation_mode_label}
              </span>
            </div>

            {/* Right Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('All')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  activeCategoryFilter === 'All'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({session.questions.length})
              </button>
              {session.categories.map((cat) => {
                const count = session.questions.filter((q) => q.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                      activeCategoryFilter === cat
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {getCategoryShortLabel(cat)} ({count})
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECTION 3: Generated Question Practice Cards */}
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const isExpanded = !!expandedGuidance[q.question_number];
              const isSaved = !!savedQuestions[q.question];
              const isCopied = copiedQuestionId === q.question_number;
              const hasContextNote = !!q.context_note;

              return (
                <div
                  key={q.question_number}
                  className={`bg-white rounded-xl p-6 shadow-xs space-y-4 transition-colors ${
                    hasContextNote
                      ? 'border-2 border-blue-600/30 hover:border-blue-600/60'
                      : 'border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Question {String(q.question_number).padStart(2, '0')}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-600 font-medium">{q.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded text-[11px] font-medium">
                        {q.difficulty}
                      </span>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                        {q.skill_or_topic}
                      </span>
                    </div>
                  </div>

                  {/* Context Note Banner if Targeted */}
                  {hasContextNote && (
                    <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 px-3 py-2 rounded-lg text-xs">
                      <div className="flex items-center gap-2 text-blue-900 font-medium">
                        <Radar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{q.context_note}</span>
                      </div>
                      <Link
                        to="/skills"
                        className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Skill Gap</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {/* Question Text */}
                  <p className="text-sm sm:text-[15px] font-semibold text-slate-900 leading-relaxed">
                    {q.question}
                  </p>

                  {/* Expandable Guidance / Evaluator Rubric */}
                  {isExpanded ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                          Key Points to Consider & Suggested Concepts to Discuss
                        </span>
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Structured Discussion Framework
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {q.guidance && q.guidance.length > 0 ? (
                          q.guidance.map((pt, pIdx) => (
                            <li key={pIdx} className="flex items-start gap-2">
                              <span className="text-slate-400 mt-0.5">•</span>
                              <span className="leading-relaxed">{pt}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-500 italic">
                            Discuss foundational architectural constraints, edge cases, and algorithmic complexity.
                          </li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500 flex items-center justify-between">
                      <span className="text-[11px]">
                        {q.guidance?.length || 3} key talking points available (conceptual depth, trade-offs, edge cases)
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">Structured guidance</span>
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => toggleGuidance(q.question_number)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                          <span>Hide Guidance</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                          <span>Reveal Guidance & Key Points</span>
                        </>
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyQuestion(q.question_number, q.question)}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy Question</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSaveQuestion(q.question)}
                        className={`border px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xs transition-colors flex items-center gap-1.5 ${
                          isSaved
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                        title="Saved locally in your browser"
                      >
                        {isSaved ? (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Saved to Local List</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                            <span>Save to Local List</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EMPTY STATE (Before any generation or when no questions) */}
      {!isGenerating && (!session || !session.questions || session.questions.length === 0) && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-700">
            <Sparkles className="w-6 h-6 text-slate-800" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              No Practice Questions Generated Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Configure your target role, difficulty, and question focus above, then click{' '}
              <strong className="text-slate-800">Generate Practice Questions</strong> to begin practicing.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGenerate}
              className="bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Generate 5 Practice Questions</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: Practice Methodology Notice */}
      <section className="bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3 transition-colors">
        <Info className="w-5 h-5 text-slate-500 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">Practice Methodology &amp; Guidance Principles</p>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Questions are dynamically calibrated against established software engineering leveling rubrics and your detected competency benchmarks. Model guidance serves as structured talking points and evaluation frameworks, not prescriptive memorization scripts.
          </p>
        </div>
      </section>

      {/* Footer Meta */}
      <footer className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="font-mono text-[11px]">
          AI Academic & Career Copilot • Interview Generation Engine
        </div>
        <div className="text-[11px] text-slate-400">
          Privacy & Verification Compliant
        </div>
      </footer>
    </div>
  );
};
