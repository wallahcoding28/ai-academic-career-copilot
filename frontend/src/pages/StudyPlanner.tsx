import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  BookOpen,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Plus,
  X,
  Target,
  FileText,
  GitFork,
  MessageSquareQuote,
  ShieldAlert,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import {
  fetchStudyPlannerContext,
  generateStudyPlan,
  fetchStudyPlanById,
  toggleStudySessionCompletion,
  regenerateStudyPlan,
  fetchStudyPlansHistory,
} from '../services/api';
import {
  StudyPlan,
  StudySession,
  StudyPlannerContext,
  StudyPlanHistoryRecord,
} from '../types';

const PRESET_TOPICS = [
  'Data Structures & Algorithms',
  'System Design',
  'Redis',
  'Docker',
  'PostgreSQL',
  'React',
  'Python',
  'Operating Systems',
  'Computer Networks',
  'Kubernetes',
  'CI/CD',
  'TypeScript',
];

const DAILY_HOURS_PRESETS = [0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0];
const HORIZON_PRESETS = [
  { weeks: 1, label: '1 Week (Sprint)' },
  { weeks: 2, label: '2 Weeks (Targeted)' },
  { weeks: 4, label: '4 Weeks (Standard)' },
  { weeks: 8, label: '8 Weeks (Comprehensive)' },
];

export const StudyPlanner: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlPlanId = searchParams.get('planId');

  // Context & Plan State
  const [context, setContext] = useState<StudyPlannerContext | null>(null);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [historyPlans, setHistoryPlans] = useState<StudyPlanHistoryRecord[]>([]);

  // Form Inputs
  const [goal, setGoal] = useState<string>('Interview Preparation');
  const [contextSource, setContextSource] = useState<'skill_gap' | 'interview' | 'resume' | 'custom'>('custom');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'Data Structures & Algorithms',
    'Redis',
    'PostgreSQL',
    'System Design',
  ]);
  const [customTopicInput, setCustomTopicInput] = useState<string>('');
  const [dailyHours, setDailyHours] = useState<number>(1.5);
  const [horizonWeeks, setHorizonWeeks] = useState<number>(4);
  const [restDaysMode, setRestDaysMode] = useState<'weekends_off' | 'daily' | 'one_day_off'>('weekends_off');
  const [includeRevision, setIncludeRevision] = useState<boolean>(true);

  // UI States
  const [isLoadingContext, setIsLoadingContext] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUpdatingSession, setIsUpdatingSession] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true, 2: true });
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [expandedSessionHints, setExpandedSessionHints] = useState<Record<number, boolean>>({});

  // 1. Initial Load: Load Context, History, and Plan (either from URL or latest)
  useEffect(() => {
    const initialize = async () => {
      setIsLoadingContext(true);
      setErrorMessage(null);
      try {
        const [ctxRes, histRes] = await Promise.all([
          fetchStudyPlannerContext(),
          fetchStudyPlansHistory(10),
        ]);

        if (ctxRes.ok && ctxRes.data) {
          setContext(ctxRes.data);
          // Auto-select skill gap context if available and has missing skills
          if (ctxRes.data.skill_gap && ctxRes.data.skill_gap.missing_skills.length > 0) {
            setContextSource('skill_gap');
            const missing = ctxRes.data.skill_gap.missing_skills;
            // Pre-populate with missing skills plus core DSA
            setSelectedTopics(Array.from(new Set(['Data Structures & Algorithms', ...missing.slice(0, 4)])));
          }
        }

        if (histRes.ok && histRes.data) {
          setHistoryPlans(histRes.data);
        }

        // If planId in URL, load that specific plan
        if (urlPlanId) {
          const planRes = await fetchStudyPlanById(parseInt(urlPlanId, 10));
          if (planRes.ok && planRes.data) {
            setActivePlan(planRes.data);
            setExpandedWeeks({ [planRes.data.next_session?.week_number || 1]: true });
          }
        } else if (histRes.ok && histRes.data && histRes.data.length > 0) {
          // Otherwise load the latest active plan
          const latestActive = histRes.data.find((p) => p.is_active) || histRes.data[0];
          const planRes = await fetchStudyPlanById(latestActive.id);
          if (planRes.ok && planRes.data) {
            setActivePlan(planRes.data);
            setExpandedWeeks({ [planRes.data.next_session?.week_number || 1]: true });
          }
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to initialize study planner.');
      } finally {
        setIsLoadingContext(false);
      }
    };

    initialize();
  }, [urlPlanId]);

  // Handle Context Source Switch
  const handleContextSourceChange = (source: 'skill_gap' | 'interview' | 'resume' | 'custom') => {
    setContextSource(source);
    if (source === 'skill_gap' && context?.skill_gap) {
      const missing = context.skill_gap.missing_skills;
      if (missing.length > 0) {
        setSelectedTopics(Array.from(new Set(['Data Structures & Algorithms', ...missing.slice(0, 4)])));
      }
    } else if (source === 'interview' && context?.interview) {
      const interviewSkills = context.interview.selected_skills;
      if (interviewSkills.length > 0) {
        setSelectedTopics(interviewSkills.slice(0, 5));
      }
    } else if (source === 'resume' && context?.resume) {
      const resSkills = context.resume.extracted_skills;
      if (resSkills.length > 0) {
        setSelectedTopics(resSkills.slice(0, 5));
      }
    }
  };

  // Add / Remove Topic Chips
  const handleAddTopic = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customTopicInput.trim();
    if (trimmed && !selectedTopics.includes(trimmed)) {
      if (selectedTopics.length >= 10) {
        setErrorMessage('Maximum 10 topics recommended per study roadmap.');
        return;
      }
      setSelectedTopics([...selectedTopics, trimmed]);
      setCustomTopicInput('');
      setErrorMessage(null);
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    if (selectedTopics.length <= 1) {
      setErrorMessage('At least one topic must remain in the study plan.');
      return;
    }
    setSelectedTopics(selectedTopics.filter((t) => t !== topicToRemove));
  };

  const handleAddPresetTopic = (topic: string) => {
    if (!selectedTopics.includes(topic)) {
      if (selectedTopics.length >= 10) {
        setErrorMessage('Maximum 10 topics recommended per study roadmap.');
        return;
      }
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  // Generate Study Plan
  const handleGeneratePlan = async () => {
    setErrorMessage(null);
    setIsGenerating(true);
    try {
      const payload = {
        goal,
        topics: selectedTopics,
        daily_hours: dailyHours,
        horizon_weeks: horizonWeeks,
        study_preferences: {
          pacing: 'balanced',
          rest_days_mode: restDaysMode,
          include_revision: includeRevision,
        },
        context_source: contextSource,
        skill_gap_id: contextSource === 'skill_gap' ? context?.skill_gap?.id : null,
        interview_session_id: contextSource === 'interview' ? context?.interview?.id : null,
        resume_id: contextSource === 'resume' ? context?.resume?.id : null,
      };

      const res = await generateStudyPlan(payload);
      if (res.ok && res.data) {
        setActivePlan(res.data);
        // Expand current week
        setExpandedWeeks({ 1: true });
        // Refresh history
        const histRes = await fetchStudyPlansHistory(10);
        if (histRes.ok && histRes.data) {
          setHistoryPlans(histRes.data);
        }
      } else {
        setErrorMessage(res.error || 'Failed to generate study plan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected error while generating study plan.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle Session Completion
  const handleToggleSession = async (session: StudySession) => {
    if (!activePlan) return;
    setIsUpdatingSession(session.id);
    try {
      const res = await toggleStudySessionCompletion(activePlan.id, session.id, !session.is_completed);
      if (res.ok && res.data) {
        // Update local session status
        const updatedSessions = activePlan.sessions.map((s) =>
          s.id === session.id ? res.data!.session : s
        );
        const nonRest = updatedSessions.filter((s) => s.activity_type !== 'Rest');
        const completedCount = nonRest.filter((s) => s.is_completed).length;
        const pct = nonRest.length > 0 ? Math.round((completedCount / nonRest.length) * 1000) / 10 : 0;

        // Find next pending session
        const nextPending = updatedSessions.find((s) => !s.is_completed && s.activity_type !== 'Rest') || null;

        setActivePlan({
          ...activePlan,
          sessions: updatedSessions,
          completed_sessions: completedCount,
          progress_percentage: pct,
          next_session: nextPending,
        });
      } else {
        setErrorMessage(res.error || 'Failed to update session completion.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating session status.');
    } finally {
      setIsUpdatingSession(null);
    }
  };

  // Transactional Versioned Regeneration
  const handleRegenerate = async () => {
    if (!activePlan) return;
    setIsRegenerating(true);
    setErrorMessage(null);
    try {
      const res = await regenerateStudyPlan(activePlan.id, {
        daily_hours: dailyHours,
        horizon_weeks: horizonWeeks,
        topics: selectedTopics,
        study_preferences: {
          rest_days_mode: restDaysMode,
          include_revision: includeRevision,
        },
      });

      if (res.ok && res.data) {
        setActivePlan(res.data);
        setExpandedWeeks({ 1: true });
        const histRes = await fetchStudyPlansHistory(10);
        if (histRes.ok && histRes.data) {
          setHistoryPlans(histRes.data);
        }
      } else {
        setErrorMessage(res.error || 'Failed to regenerate study plan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to regenerate plan.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Toggle Week Accordion
  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [weekNum]: !prev[weekNum],
    }));
  };

  // Toggle Resource Hints
  const toggleResourceHints = (sessionId: number) => {
    setExpandedSessionHints((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  // Organize sessions by week
  const sessionsByWeek: Record<number, StudySession[]> = {};
  if (activePlan?.sessions) {
    for (const sess of activePlan.sessions) {
      if (!sessionsByWeek[sess.week_number]) {
        sessionsByWeek[sess.week_number] = [];
      }
      sessionsByWeek[sess.week_number].push(sess);
    }
  }

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* 1. Header & Breadcrumbs */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              CAREER WORKFLOW / STUDY & REVISION PLANNER
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Study Planner</h1>
          <p className="text-xs text-slate-500 mt-1">
            Build a structured, realistic study plan around your target goals, available study time, and identified skill gaps.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {historyPlans.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Saved Plans ({historyPlans.length})</span>
            </button>
          )}
          <Link
            to="/history"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            History Archive
          </Link>
        </div>
      </section>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xs font-bold text-rose-900">Validation Notice</h3>
            <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Plan Configuration & Calibration Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-700" />
              <span>Plan Calibration &amp; Constraints</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">Step 1: Define Goals &amp; Time</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure target objectives, daily study capacity, and planning horizon to construct a balanced timetable.
          </p>
        </div>

        {/* Planning Goal Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Planning Goal
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              'Interview Preparation',
              'Skill Development',
              'Academic Subjects',
              'Career Preparation',
              'Mixed Goals',
            ].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  goal === g
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Context Integration Source Cards */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Optional Cross-Module Context
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Source A: Skill Gap Analysis */}
            <div
              onClick={() => context?.skill_gap && handleContextSourceChange('skill_gap')}
              className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                contextSource === 'skill_gap'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30'
                  : context?.skill_gap
                  ? 'border-slate-200 bg-white hover:border-slate-300'
                  : 'border-slate-200 bg-slate-50/60 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5 text-blue-600" />
                  Skill Gap Analysis
                </span>
                <input
                  type="radio"
                  name="context_source"
                  checked={contextSource === 'skill_gap'}
                  onChange={() => handleContextSourceChange('skill_gap')}
                  disabled={!context?.skill_gap}
                  className="accent-slate-900"
                />
              </div>
              {context?.skill_gap ? (
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div className="font-medium text-slate-800">
                    Role: {context.skill_gap.target_role} ({context.skill_gap.core_coverage}% core)
                  </div>
                  <div className="text-blue-700 font-medium">
                    Importing {context.skill_gap.missing_skills.length} missing skill(s)
                  </div>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">No skill gap evaluation found</span>
              )}
            </div>

            {/* Source B: Interview Generator */}
            <div
              onClick={() => context?.interview && handleContextSourceChange('interview')}
              className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                contextSource === 'interview'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30'
                  : context?.interview
                  ? 'border-slate-200 bg-white hover:border-slate-300'
                  : 'border-slate-200 bg-slate-50/60 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-blue-600" />
                  Interview Prep
                </span>
                <input
                  type="radio"
                  name="context_source"
                  checked={contextSource === 'interview'}
                  onChange={() => handleContextSourceChange('interview')}
                  disabled={!context?.interview}
                  className="accent-slate-900"
                />
              </div>
              {context?.interview ? (
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div className="font-medium text-slate-800">
                    Role: {context.interview.target_role} ({context.interview.difficulty})
                  </div>
                  <div className="text-blue-700 font-medium">
                    Importing {context.interview.selected_skills.length} focus topics
                  </div>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">No interview sessions found</span>
              )}
            </div>

            {/* Source C: Custom Selection */}
            <div
              onClick={() => handleContextSourceChange('custom')}
              className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                contextSource === 'custom'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-slate-700" />
                  Custom Topics Only
                </span>
                <input
                  type="radio"
                  name="context_source"
                  checked={contextSource === 'custom'}
                  onChange={() => handleContextSourceChange('custom')}
                  className="accent-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Plan without prior analysis; select topics and timetable manually.
              </p>
            </div>
          </div>
        </div>

        {/* Topics & Subjects Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Topics / Subjects ({selectedTopics.length} selected)
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-2.5 min-h-[50px]">
            {selectedTopics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white text-slate-800 border border-slate-200/90 shadow-2xs"
              >
                <span>{topic}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTopic(topic)}
                  className="text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add Custom Topic Input */}
          <form onSubmit={handleAddTopic} className="flex gap-2">
            <input
              type="text"
              value={customTopicInput}
              onChange={(e) => setCustomTopicInput(e.target.value)}
              placeholder="Add another topic or chapter (e.g. Distributed Caching, Kubernetes)..."
              className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Topic</span>
            </button>
          </form>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px] text-slate-500">
            <span className="font-medium text-slate-600">Quick Suggestions:</span>
            {PRESET_TOPICS.filter((t) => !selectedTopics.includes(t))
              .slice(0, 6)
              .map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => handleAddPresetTopic(pt)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-[10px]"
                >
                  + {pt}
                </button>
              ))}
          </div>
        </div>

        {/* Daily Time & Planning Horizon Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
          {/* Daily Study Time */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Available Daily Study Time
              </label>
              <span className="text-xs font-bold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {dailyHours} Hours / Day ({Math.round(dailyHours * 60)} min)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DAILY_HOURS_PRESETS.map((hrs) => (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => setDailyHours(hrs)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                    dailyHours === hrs
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {hrs === 0.5 ? '30 min' : `${hrs} hr${hrs > 1 ? 's' : ''}`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Realistic commitment boundary: 30 minutes to 6 hours per day.
            </p>
          </div>

          {/* Planning Horizon */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Planning Horizon
              </label>
              <span className="text-xs font-bold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {horizonWeeks} Weeks ({horizonWeeks * 7} Days)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {HORIZON_PRESETS.map((item) => (
                <button
                  key={item.weeks}
                  type="button"
                  onClick={() => setHorizonWeeks(item.weeks)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors text-left ${
                    horizonWeeks === item.weeks
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Study Preferences (Collapsible) */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowPreferences(!showPreferences)}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
          >
            <span>Advanced Pacing &amp; Rest Day Controls</span>
            {showPreferences ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showPreferences && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Rest Day Cadence</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rest_mode"
                      checked={restDaysMode === 'weekends_off'}
                      onChange={() => setRestDaysMode('weekends_off')}
                      className="accent-slate-900"
                    />
                    <span>Weekends off (5 study days, 2 buffer days/week)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rest_mode"
                      checked={restDaysMode === 'one_day_off'}
                      onChange={() => setRestDaysMode('one_day_off')}
                      className="accent-slate-900"
                    />
                    <span>1 Rest Day per week (6 study days/week)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rest_mode"
                      checked={restDaysMode === 'daily'}
                      onChange={() => setRestDaysMode('daily')}
                      className="accent-slate-900"
                    />
                    <span>Daily study (7 days/week, continuous)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Spaced Repetition &amp; Review</label>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={includeRevision}
                    onChange={(e) => setIncludeRevision(e.target.checked)}
                    className="accent-slate-900"
                  />
                  <span>Include weekly review &amp; quiz checkpoints</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1">
                  Allocates the 5th study day of each cycle to concept self-testing and edge cases.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Primary CTA Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all ${
              isGenerating
                ? 'bg-slate-400 text-white cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isGenerating ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Balancing &amp; Synthesizing Study Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Study Plan</span>
              </>
            )}
          </button>

          <span className="text-[11px] text-slate-400 text-center sm:text-right">
            Dual-Engine: Synthesizes via Gemini 3.8 Flash with automatic offline catalog fallback.
          </span>
        </div>
      </section>

      {/* 3. Generated Plan Canvas */}
      {isGenerating ? (
        /* Loading Skeleton */
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs space-y-4 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="grid grid-cols-4 gap-3 pt-4">
            <div className="h-16 bg-slate-100 rounded"></div>
            <div className="h-16 bg-slate-100 rounded"></div>
            <div className="h-16 bg-slate-100 rounded"></div>
            <div className="h-16 bg-slate-100 rounded"></div>
          </div>
          <div className="h-32 bg-slate-50 rounded mt-4"></div>
        </div>
      ) : activePlan ? (
        <div className="space-y-6">
          {/* Plan Summary Strip (4-KPI Bar) */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{activePlan.title}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    v{activePlan.version}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {activePlan.generation_mode_label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Context: {activePlan.context_source === 'skill_gap' ? 'Skill Gap Analysis' : activePlan.context_source === 'interview' ? 'Interview Prep' : 'Custom'}
                  {' • '}
                  Created on {new Date(activePlan.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Regenerate Action */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isRegenerating ? 'animate-spin' : ''}`} />
                  <span>Regenerate Roadmap</span>
                </button>
              </div>
            </div>

            {/* 4-KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Planning Goal</span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">{activePlan.goal}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Horizon</span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                  {activePlan.horizon_weeks} Weeks • {activePlan.daily_hours}h/day
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Workload</span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block font-mono">
                  {activePlan.total_study_sessions} Sessions • {activePlan.total_hours}h
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Completion</span>
                <span className="text-xs font-bold text-emerald-700 mt-0.5 block font-mono">
                  {activePlan.completed_sessions} of {activePlan.total_study_sessions} ({activePlan.progress_percentage}%)
                </span>
              </div>
            </div>

            {/* Linear Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, activePlan.progress_percentage))}%` }}
                ></div>
              </div>
            </div>
          </section>

          {/* 4. "Today's Study Session" / Next Focus Hero Spotlight */}
          {activePlan.next_session ? (
            <section className="bg-white border-2 border-blue-600/70 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 font-mono">
                    TODAY'S STUDY SESSION • DAY {activePlan.next_session.day_number} (WEEK {activePlan.next_session.week_number})
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    Next Actionable Focus
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    Duration: <strong className="text-slate-800 font-mono">{activePlan.next_session.duration_minutes} mins</strong>
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{activePlan.next_session.topic}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {activePlan.next_session.activity_type}
                  </span>
                  {activePlan.next_session.priority === 'core_gap' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Targeted Skill Gap
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {activePlan.next_session.session_objective}
                </p>
              </div>

              {/* Resource Hints */}
              {activePlan.next_session.resource_hints && activePlan.next_session.resource_hints.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    Key Concepts &amp; Practical Exercises:
                  </span>
                  <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
                    {activePlan.next_session.resource_hints.map((hint, idx) => (
                      <li key={idx} className="leading-relaxed">{hint}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleSession(activePlan.next_session!)}
                  disabled={isUpdatingSession === activePlan.next_session.id}
                  className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Mark Session Complete</span>
                </button>
                <span className="text-[11px] text-slate-400">
                  Updates your verified roadmap progress atomically
                </span>
              </div>
            </section>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-emerald-900">All Scheduled Sessions Completed!</h3>
              <p className="text-xs text-emerald-700">
                You have completed all {activePlan.total_study_sessions} planned study sessions in this roadmap.
              </p>
            </div>
          )}

          {/* 5. Multi-Week Structured Study Roadmap */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Multi-Week Study Roadmap</h2>
                <p className="text-xs text-slate-500">
                  Sequenced day-by-day study sessions with concrete objectives and review buffers.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {activePlan.horizon_weeks} Weeks • {activePlan.sessions.length} Total Days
              </span>
            </div>

            <div className="space-y-3">
              {Array.from({ length: activePlan.horizon_weeks }, (_, i) => i + 1).map((weekNum) => {
                const weekSessions = sessionsByWeek[weekNum] || [];
                const nonRestWeek = weekSessions.filter((s) => s.activity_type !== 'Rest');
                const completedInWeek = nonRestWeek.filter((s) => s.is_completed).length;
                const isWeekComplete = nonRestWeek.length > 0 && completedInWeek === nonRestWeek.length;
                const isExpanded = !!expandedWeeks[weekNum];

                return (
                  <div
                    key={weekNum}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all"
                  >
                    {/* Week Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleWeek(weekNum)}
                      className="w-full p-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center font-mono">
                          {weekNum}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              Week {weekNum} Roadmap
                            </span>
                            {isWeekComplete ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Completed
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                                {completedInWeek} / {nonRestWeek.length} Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </button>

                    {/* Week Sessions List */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100">
                        {weekSessions.map((session) => {
                          const isRest = session.activity_type === 'Rest';
                          const isHintsOpen = !!expandedSessionHints[session.id];

                          return (
                            <div
                              key={session.id}
                              className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                                session.is_completed
                                  ? 'bg-emerald-50/20'
                                  : isRest
                                  ? 'bg-slate-50/50'
                                  : 'bg-white hover:bg-slate-50/50'
                              }`}
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[11px] font-bold text-slate-500">
                                    Day {session.day_number}
                                  </span>

                                  <h4 className={`text-xs font-bold ${
                                    session.is_completed ? 'line-through text-slate-500' : 'text-slate-900'
                                  }`}>
                                    {session.topic}
                                  </h4>

                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    isRest
                                      ? 'bg-slate-100 text-slate-600'
                                      : session.activity_type === 'Review & Quiz'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : session.activity_type === 'Project Work'
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}>
                                    {session.activity_type}
                                  </span>

                                  <span className="text-[10px] font-mono text-slate-400">
                                    {session.duration_minutes}m
                                  </span>

                                  {session.priority === 'core_gap' && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                      Skill Gap
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {session.session_objective}
                                </p>

                                {/* Resource Hints Toggle */}
                                {!isRest && session.resource_hints && session.resource_hints.length > 0 && (
                                  <div className="pt-1">
                                    <button
                                      type="button"
                                      onClick={() => toggleResourceHints(session.id)}
                                      className="text-[11px] font-medium text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      <span>{isHintsOpen ? 'Hide Key Concepts' : 'Show Key Concepts'}</span>
                                      {isHintsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>

                                    {isHintsOpen && (
                                      <ul className="mt-1.5 text-[11px] text-slate-600 list-disc list-inside bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                                        {session.resource_hints.map((hint, hIdx) => (
                                          <li key={hIdx}>{hint}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Completion Toggle */}
                              {!isRest && (
                                <div className="shrink-0 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSession(session)}
                                    disabled={isUpdatingSession === session.id}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                      session.is_completed
                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    {session.is_completed ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Completed</span>
                                      </>
                                    ) : (
                                      <>
                                        <Circle className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Mark Done</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-700">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Active Study Roadmap Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Configure your target goal, verified missing skills, and daily hours above, then click{' '}
            <strong className="text-slate-800">Generate Study Plan</strong> to calculate a balanced timetable.
          </p>
        </div>
      )}

      {/* 6. Academic Transparency & Responsible AI Notice */}
      <section className="bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3 transition-colors">
        <ShieldAlert className="w-5 h-5 text-slate-500 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="font-bold text-slate-900 dark:text-white">Responsible AI &amp; Pacing Methodology:</span>{' '}
          Study roadmaps are calculated to balance cognitive workload and spaced repetition around your stated available time. They provide structured conceptual direction and do not guarantee academic examination scores or employment offers.
        </div>
      </section>

      {/* Saved Plans Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700" />
                <span>Previously Generated Study Roadmaps</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {historyPlans.map((hp) => (
                <div
                  key={hp.id}
                  onClick={async () => {
                    setShowHistoryModal(false);
                    const res = await fetchStudyPlanById(hp.id);
                    if (res.ok && res.data) {
                      setActivePlan(res.data);
                      setExpandedWeeks({ 1: true });
                    }
                  }}
                  className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{hp.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      v{hp.version} {hp.is_active ? '• Active' : '• Archived'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{hp.horizon_weeks}w • {hp.daily_hours}h/day ({hp.total_hours}h total)</span>
                    <span className="font-semibold text-emerald-700">
                      {hp.completed_study_sessions} / {hp.total_study_sessions} Completed ({hp.progress_percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
