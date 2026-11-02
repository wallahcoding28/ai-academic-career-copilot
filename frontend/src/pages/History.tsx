import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  History as HistoryIcon,
  Clock,
  FileText,
  GitFork,
  MessageSquareQuote,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  GitCompare,
  Check,
  Cpu,
  ChevronDown,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  fetchResumeHistory,
  fetchResumeById,
  fetchSkillGapHistory,
  fetchInterviewHistory,
  fetchStudyPlansHistory,
} from '../services/api';
import {
  ResumeRecord,
  SkillGapHistoryRecord,
  InterviewHistoryRecord,
  StudyPlanHistoryRecord,
  ResumeAnalysisResult,
} from '../types';
import { useResume } from '../context/ResumeContext';

export const History: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectResumeById, activeResumeId } = useResume();

  const [activeTab, setActiveTab] = useState<'all' | 'resumes' | 'skills' | 'interviews' | 'plans'>('all');
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [skillGaps, setSkillGaps] = useState<SkillGapHistoryRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewHistoryRecord[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlanHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selected Historical Resume State
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(() => {
    const p = searchParams.get('resumeId');
    return p ? parseInt(p, 10) : null;
  });
  const [detailedResume, setDetailedResume] = useState<ResumeAnalysisResult | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Comparison State
  const [isComparing, setIsComparing] = useState(false);
  const [compareResumeId, setCompareResumeId] = useState<number | null>(null);
  const [compareResumeData, setCompareResumeData] = useState<ResumeAnalysisResult | null>(null);
  const [activeToast, setActiveToast] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const [resumesRes, skillsRes, interviewRes, studyRes] = await Promise.all([
          fetchResumeHistory(),
          fetchSkillGapHistory(),
          fetchInterviewHistory(),
          fetchStudyPlansHistory(),
        ]);
        if (resumesRes.ok && resumesRes.data) {
          setResumes(resumesRes.data);
        }
        if (skillsRes.ok && skillsRes.data) {
          setSkillGaps(skillsRes.data);
        }
        if (interviewRes.ok && interviewRes.data) {
          setInterviews(interviewRes.data);
        }
        if (studyRes.ok && studyRes.data) {
          setStudyPlans(studyRes.data);
        }
      } catch (err) {
        console.error('Failed to load history data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, []);

  // When selectedResumeId changes, fetch or locate the detailed record
  useEffect(() => {
    if (!selectedResumeId) {
      setDetailedResume(null);
      setIsComparing(false);
      setCompareResumeId(null);
      setCompareResumeData(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDetail(true);

    fetchResumeById(selectedResumeId).then((res) => {
      if (isMounted) {
        if (res.ok && res.data) {
          setDetailedResume(res.data);
        } else {
          // Fallback from existing resumes array
          const found = resumes.find((r) => r.id === selectedResumeId);
          if (found) {
            setDetailedResume({
              id: found.id,
              filename: found.filename,
              file_size: found.file_size,
              target_role: found.feedback?.target_role || 'Not specified',
              analysis_mode: found.feedback?.analysis_mode || 'ats_heuristic',
              score: found.score,
              summary: found.feedback?.summary || 'Not available',
              matched_skills: found.feedback?.matched_skills || found.extracted_skills || [],
              missing_skills: found.feedback?.missing_skills || [],
              bullet_improvements: found.feedback?.bullet_improvements || [],
              formatting_audit: found.feedback?.formatting_audit || {
                readability: 'Not available',
                ats_score: found.score,
                formatting_flags: [],
              },
            });
          }
        }
        setIsLoadingDetail(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedResumeId, resumes]);

  // When compareResumeId changes, fetch comparison record
  useEffect(() => {
    if (!compareResumeId) {
      setCompareResumeData(null);
      return;
    }

    let isMounted = true;
    fetchResumeById(compareResumeId).then((res) => {
      if (isMounted && res.ok && res.data) {
        setCompareResumeData(res.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [compareResumeId]);

  const handleSelectResumeCard = (id: number) => {
    setSelectedResumeId(id);
    setSearchParams({ resumeId: String(id) });
  };

  const handleBackToList = () => {
    setSelectedResumeId(null);
    setIsComparing(false);
    setCompareResumeId(null);
    setSearchParams({});
  };

  const handleMakeActive = async (id: number, filename: string) => {
    const ok = await selectResumeById(id);
    if (ok) {
      setActiveToast(`"${filename}" is now the active resume in your workspace.`);
      setTimeout(() => setActiveToast(null), 3000);
    }
  };

  const showResumes = activeTab === 'all' || activeTab === 'resumes';
  const showSkills = activeTab === 'all' || activeTab === 'skills';
  const showInterviews = activeTab === 'all' || activeTab === 'interviews';
  const showPlans = activeTab === 'all' || activeTab === 'plans';
  const totalCount =
    (showResumes ? resumes.length : 0) +
    (showSkills ? skillGaps.length : 0) +
    (showInterviews ? interviews.length : 0) +
    (showPlans ? studyPlans.length : 0);

  // If a specific resume is selected, render the Historical Snapshot Detail / Comparison View
  if (selectedResumeId && (detailedResume || isLoadingDetail)) {
    const otherResumes = resumes.filter((r) => r.id !== selectedResumeId);

    // Compute comparison metrics if comparing
    let scoreDelta = 0;
    let addedSkills: string[] = [];
    let retainedSkills: string[] = [];
    let removedSkills: string[] = [];

    if (detailedResume && compareResumeData) {
      scoreDelta = Math.round(compareResumeData.score - detailedResume.score);
      const setA = new Set(detailedResume.matched_skills || []);
      const setB = new Set(compareResumeData.matched_skills || []);

      addedSkills = Array.from(setB).filter((x) => !setA.has(x));
      retainedSkills = Array.from(setB).filter((x) => setA.has(x));
      removedSkills = Array.from(setA).filter((x) => !setB.has(x));
    }

    return (
      <div className="space-y-6 pb-12 max-w-5xl mx-auto">
        {/* Navigation & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <button
            onClick={handleBackToList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors self-start"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Back to Activity History</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {otherResumes.length > 0 && (
              <button
                onClick={() => {
                  if (!isComparing) {
                    setIsComparing(true);
                    if (!compareResumeId && otherResumes.length > 0) {
                      setCompareResumeId(otherResumes[0].id);
                    }
                  } else {
                    setIsComparing(false);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isComparing
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>{isComparing ? 'Close Comparison' : 'Compare Snapshots'}</span>
              </button>
            )}

            {detailedResume && (
              <button
                onClick={() => handleMakeActive(detailedResume.id!, detailedResume.filename)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  activeResumeId === detailedResume.id
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{activeResumeId === detailedResume.id ? 'Active in Workspace' : 'Set as Active Resume'}</span>
              </button>
            )}
          </div>
        </div>

        {activeToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2 shadow-2xs animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{activeToast}</span>
          </div>
        )}

        {isLoadingDetail || !detailedResume ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            Loading historical snapshot details...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Snapshot Metadata Banner */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Historical Analysis Snapshot
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-mono text-slate-500">Record #{detailedResume.id}</span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-slate-500">
                  Engine: <span className="font-semibold text-slate-700">{detailedResume.analysis_mode === 'gemini_ai' ? 'Gemini 3.8 Flash' : 'Deterministic ATS (Offline)'}</span>
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">
                {detailedResume.filename}
              </h1>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span>Target Role: <strong className="text-slate-700">{detailedResume.target_role || 'Not specified'}</strong></span>
                <span>•</span>
                <span>File Size: <strong className="text-slate-700">{(detailedResume.file_size / 1024).toFixed(1)} KB</strong></span>
                <span>•</span>
                <span className="font-mono text-slate-400">Saved Snapshot</span>
              </p>
            </div>

            {/* Comparison Mode Panel */}
            {isComparing && (
              <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Snapshot Comparison View
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-300 whitespace-nowrap">Compare against:</label>
                    <div className="relative">
                      <select
                        value={compareResumeId ?? ''}
                        onChange={(e) => setCompareResumeId(Number(e.target.value))}
                        className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1 text-xs font-medium pr-7 appearance-none cursor-pointer focus:ring-1 focus:ring-emerald-400"
                      >
                        {otherResumes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.filename} (Score: {Math.round(r.score)} • #{r.id})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {compareResumeData ? (
                  <div className="space-y-4">
                    {/* Score Comparison Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Snapshot A (Selected)
                        </div>
                        <div className="text-xl font-bold text-white mt-1">
                          {Math.round(detailedResume.score)} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {detailedResume.filename}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Snapshot B (Compared)
                        </div>
                        <div className="text-xl font-bold text-white mt-1">
                          {Math.round(compareResumeData.score)} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {compareResumeData.filename}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Score Evolution Delta
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xl font-bold px-2 py-0.5 rounded ${
                              scoreDelta > 0
                                ? 'bg-emerald-900/60 text-emerald-300'
                                : scoreDelta < 0
                                ? 'bg-rose-900/60 text-rose-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {scoreDelta > 0 ? 'Improvement observed' : scoreDelta < 0 ? 'Score decreased' : 'Identical score'}
                        </div>
                      </div>
                    </div>

                    {/* Skill Evolution Delta */}
                    <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/80 space-y-3">
                      <div className="text-xs font-semibold text-slate-300">
                        Skill Coverage Differences
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {/* New Skills */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-emerald-400">
                            New in Snapshot B ({addedSkills.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {addedSkills.length > 0 ? (
                              addedSkills.map((s) => (
                                <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-emerald-900/50 text-emerald-200 border border-emerald-700/50">
                                  + {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-500">None</span>
                            )}
                          </div>
                        </div>

                        {/* Shared Skills */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-slate-300">
                            Retained in Both ({retainedSkills.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {retainedSkills.length > 0 ? (
                              retainedSkills.map((s) => (
                                <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-slate-700/60 text-slate-300 border border-slate-600/50">
                                  ✓ {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-500">None</span>
                            )}
                          </div>
                        </div>

                        {/* Removed Skills */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-amber-400">
                            In Snapshot A only ({removedSkills.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {removedSkills.length > 0 ? (
                              removedSkills.map((s) => (
                                <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-amber-900/40 text-amber-300 border border-amber-700/50">
                                  - {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-500">None</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">Loading comparison snapshot...</div>
                )}
              </div>
            )}

            {/* Dashboard-Style Summary Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Overall ATS Score */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Overall Resume Score
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                    {Math.round(detailedResume.score)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ 100 benchmark</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      detailedResume.score >= 75
                        ? 'bg-emerald-600'
                        : detailedResume.score >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(4, Math.min(100, detailedResume.score))}%` }}
                  />
                </div>
                <div className="pt-1 text-[11px] text-slate-500 flex justify-between">
                  <span>ATS Score: <strong className="text-slate-700">{detailedResume.formatting_audit?.ats_score ?? 'Not available'}</strong></span>
                  <span>Readability: <strong className="text-slate-700">{detailedResume.formatting_audit?.readability ?? 'Not available'}</strong></span>
                </div>
              </div>

              {/* Card 2: Skill Count & Target Role */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Target Alignment
                </div>
                <div className="text-lg font-bold text-slate-900 truncate">
                  {detailedResume.target_role || 'Not specified'}
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>Detected Skills: <strong className="text-slate-900">{detailedResume.matched_skills?.length ?? 0}</strong></div>
                  <div>Missing Competencies: <strong className="text-slate-900">{detailedResume.missing_skills?.length ?? 0}</strong></div>
                </div>
              </div>

              {/* Card 3: Document Status */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Snapshot Integrity
                </div>
                <div className="text-xs text-slate-600 space-y-1.5">
                  <div>Stored Record ID: <strong className="font-mono text-slate-900">#{detailedResume.id}</strong></div>
                  <div>File Size: <strong className="text-slate-900">{(detailedResume.file_size / 1024).toFixed(1)} KB</strong></div>
                  <div>Analysis Source: <strong className="text-slate-900">SQLite Database</strong></div>
                </div>
              </div>
            </div>

            {/* Diagnostic Executive Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Diagnostic Findings & Summary
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {detailedResume.summary || 'Not available'}
              </p>
            </div>

            {/* Skills & Missing Competencies (Two Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Detected Skills */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Detected Skills ({detailedResume.matched_skills?.length ?? 0})</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detailedResume.matched_skills && detailedResume.matched_skills.length > 0 ? (
                    detailedResume.matched_skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        ✓ {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Not available</span>
                  )}
                </div>
              </div>

              {/* Missing Competencies */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Identified Gaps ({detailedResume.missing_skills?.length ?? 0})</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detailedResume.missing_skills && detailedResume.missing_skills.length > 0 ? (
                    detailedResume.missing_skills.map((gap) => (
                      <span
                        key={gap}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                      >
                        + {gap}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Not available</span>
                  )}
                </div>
              </div>
            </div>

            {/* Google X-Y-Z Bullet Improvements */}
            {detailedResume.bullet_improvements && detailedResume.bullet_improvements.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Google X-Y-Z Formula Bullet Improvements</span>
                </div>

                <div className="space-y-3">
                  {detailedResume.bullet_improvements.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">
                          Original Text:
                        </span>
                        <p className="text-slate-700 line-through text-slate-400">{item.original}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-700 uppercase text-[10px] tracking-wider block mb-0.5">
                          X-Y-Z Recommended Upgrade:
                        </span>
                        <p className="text-slate-900 font-medium bg-white p-2.5 rounded border border-slate-200/80">
                          {item.improved}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">
                          Rationale:
                        </span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">{item.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default View: Full History Activity List
  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs font-medium">
        {[
          { id: 'all', label: `All Activities (${resumes.length + skillGaps.length + interviews.length + studyPlans.length})`, icon: Clock },
          { id: 'resumes', label: `Resumes (${resumes.length})`, icon: FileText },
          { id: 'skills', label: `Skill Gaps (${skillGaps.length})`, icon: GitFork },
          { id: 'interviews', label: `Interviews (${interviews.length})`, icon: MessageSquareQuote },
          { id: 'plans', label: `Study Plans (${studyPlans.length})`, icon: CalendarDays },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading history from SQLite database...
        </div>
      ) : totalCount > 0 ? (
        <div className="space-y-8">
          {/* Skill Gap Evaluations Section */}
          {showSkills && skillGaps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <GitFork className="w-3.5 h-3.5 text-slate-700" />
                  <span>Skill Gap Evaluations ({skillGaps.length} stored in SQLite)</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Database Active</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {skillGaps.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-subtle transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                          <GitFork className="w-5 h-5 text-slate-700" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {rec.target_role}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                rec.match_percentage >= 70
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.match_percentage >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Coverage: {Math.round(rec.match_percentage)}%
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                            <span>Core: {Math.round(rec.core_coverage)}%</span>
                            <span>•</span>
                            <span>Comp: {Math.round(rec.complementary_coverage)}%</span>
                            <span>•</span>
                            <span>Source: {rec.resume_filename}</span>
                            <span>•</span>
                            <span className="text-slate-400 font-mono text-[11px]">{rec.created_at}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 self-start sm:self-auto">
                        <span className="font-semibold text-slate-700">{rec.matched_skills.length}</span> direct •{' '}
                        <span className="font-semibold text-blue-700">{rec.adjacent_skills.length}</span> adjacent •{' '}
                        <span className="font-semibold text-amber-700">{rec.missing_skills.length}</span> missing
                      </div>
                    </div>

                    {/* Skill chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                      {rec.matched_skills.slice(0, 4).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          ✓ {s.name}
                        </span>
                      ))}
                      {rec.adjacent_skills.slice(0, 2).map((a, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200"
                        >
                          ↔ {a.target_skill}
                        </span>
                      ))}
                      {rec.missing_skills.slice(0, 3).map((m, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600"
                        >
                          + {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evaluated Resumes Section (Clickable) */}
          {showResumes && resumes.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-700" />
                  <span>Evaluated Resumes ({resumes.length} stored in SQLite)</span>
                </div>
                <span className="text-[11px] text-slate-500 font-normal">Click any resume to view historical analysis</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {resumes.map((rec) => {
                  const isSelected = selectedResumeId === rec.id;
                  return (
                    <div
                      key={rec.id}
                      onClick={() => handleSelectResumeCard(rec.id)}
                      className={`bg-white rounded-xl border p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group ${
                        isSelected
                          ? 'ring-2 ring-slate-900 border-slate-900 bg-slate-50/70 shadow-sm'
                          : 'border-slate-200/90 shadow-2xs hover:shadow-subtle hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 border border-slate-200 text-slate-700 group-hover:bg-slate-200'
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                              {rec.filename}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                rec.score >= 75
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.score >= 55
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Score: {Math.round(rec.score)}/100
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                            <span>{(rec.file_size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{rec.extracted_skills.length} matched skills</span>
                            <span>•</span>
                            <span className="text-slate-400 font-mono text-[11px]">{rec.created_at}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-start sm:self-auto">
                        <div className="hidden sm:flex items-center gap-1.5 flex-wrap max-w-xs">
                          {rec.extracted_skills.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700"
                            >
                              {skill}
                            </span>
                          ))}
                          {rec.extracted_skills.length > 4 && (
                            <span className="text-[10px] text-slate-400">
                              +{rec.extracted_skills.length - 4} more
                            </span>
                          )}
                        </div>

                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-700 text-xs font-semibold transition-colors">
                          <span>View Analysis</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interview Practice Sessions Section */}
          {showInterviews && interviews.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-slate-700" />
                  <span>Interview Practice Sets ({interviews.length} stored in SQLite)</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Database Active
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {interviews.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-subtle transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <MessageSquareQuote className="w-5 h-5 text-white" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {rec.target_role}
                          </span>
                          <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                            {rec.difficulty}
                          </span>
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                            {rec.question_count} Questions
                          </span>
                          <span className="text-[10px] font-mono bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded">
                            {rec.generation_mode_label}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                          <span>Focus: {rec.question_focus}</span>
                          <span>•</span>
                          <span>Context: {rec.context_source}</span>
                          <span>•</span>
                          <span className="text-slate-400 font-mono text-[11px]">{rec.created_at}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <Link
                        to={`/interview-generator?sessionId=${rec.id}`}
                        className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold py-2 px-3.5 rounded-lg inline-flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <span>Open Questions</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Study Plans Section */}
          {showPlans && studyPlans.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-700" />
                  <span>AI Study Plans ({studyPlans.length} stored in SQLite)</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Database Active
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {studyPlans.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-subtle transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CalendarDays className="w-5 h-5 text-white" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {rec.title}
                          </span>
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                            v{rec.version}
                          </span>
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                            {rec.horizon_weeks} {rec.horizon_weeks === 1 ? 'Week' : 'Weeks'}
                          </span>
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                            {rec.daily_hours}h / day
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                          <span>Goal: {rec.goal}</span>
                          {rec.target_date && (
                            <>
                              <span>•</span>
                              <span>Target: {rec.target_date}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-slate-400 font-mono text-[11px]">{rec.created_at}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="pt-1 flex items-center gap-2 max-w-md">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.round(rec.progress_percentage || 0))}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                            {rec.completed_study_sessions} / {rec.total_study_sessions} ({Math.round(rec.progress_percentage || 0)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <Link
                        to={`/study-planner?planId=${rec.id}`}
                        className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold py-2 px-3.5 rounded-lg inline-flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <span>Open Plan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            No Records Found for Selected Filter
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {activeTab === 'skills'
              ? 'Evaluate your technical profile in the Skill Gap Analyzer to see historical benchmark runs and progression tracked here.'
              : activeTab === 'resumes'
              ? 'Upload your first resume in the Resume Analyzer module to see historical evaluations and keyword progression tracked here.'
              : activeTab === 'interviews'
              ? 'Generate role-calibrated questions in the Interview Generator to see historical practice sets saved here.'
              : activeTab === 'plans'
              ? 'Generate a personalized study roadmap in the AI Study Planner to see active and archived revision schedules tracked here.'
              : 'Records for completed activities across all modules will appear here.'}
          </p>
        </div>
      )}
    </div>
  );
};
