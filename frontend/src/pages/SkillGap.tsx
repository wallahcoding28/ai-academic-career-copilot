import React, { useState, useEffect, useRef } from 'react';
import {
  GitFork,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  X,
  Layers,
  ChevronDown,
  Info,
  Check,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import {
  fetchRoleBenchmarks,
  fetchResumeHistory,
  fetchSkillEvaluationByResume,
  evaluateSkillGapReuse,
  evaluateSkillGapUpload,
} from '../services/api';
import {
  RoleBenchmarkSummary,
  ResumeRecord,
  SkillGapResult,
} from '../types';
import { useResume } from '../context/ResumeContext';

export const SkillGap: React.FC = () => {
  const {
    activeResumeId,
    activeResumeAnalysis,
    activeSkillGapResult,
    setActiveSkillGap,
    selectResumeById,
    availableResumes,
    activeTargetRole,
    setActiveTargetRole,
  } = useResume();

  // Input configuration states
  const [inputMode, setInputMode] = useState<'reuse' | 'upload'>('reuse');
  const [roles, setRoles] = useState<RoleBenchmarkSummary[]>([]);
  const [selectedRole, setSelectedRole] = useState(activeTargetRole || 'Full Stack Developer');
  const [resumes, setResumes] = useState<ResumeRecord[]>(availableResumes);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(activeResumeId);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading & Execution states
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analysis result state - initialize with activeSkillGapResult if available
  const [result, setResult] = useState<SkillGapResult | null>(activeSkillGapResult);

  // Load available roles and existing resumes on mount, restore prior evaluation if available
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setIsLoadingRoles(true);
      const rolesRes = await fetchRoleBenchmarks();
      if (isMounted && rolesRes.ok && rolesRes.data && rolesRes.data.length > 0) {
        setRoles(rolesRes.data);
        if (!activeTargetRole) {
          setSelectedRole(rolesRes.data[0].title);
        }
      }
      if (isMounted) setIsLoadingRoles(false);

      setIsLoadingResumes(true);
      const resumesRes = await fetchResumeHistory();
      let latestResumes: ResumeRecord[] = [];
      if (resumesRes.ok && resumesRes.data && resumesRes.data.length > 0) {
        latestResumes = resumesRes.data;
        if (isMounted) {
          setResumes(latestResumes);
        }
      } else if (isMounted) {
        setResumes([]);
        setSelectedResumeId(null);
        setResult(null);
      }
      if (isMounted) setIsLoadingResumes(false);

      // Determine target resume to evaluate
      const currentTargetId = activeResumeId || (latestResumes.length > 0 ? latestResumes[0].id : null);
      if (isMounted && currentTargetId) {
        setSelectedResumeId(currentTargetId);

        // If we don't already have the skill gap result in memory, query backend for any prior evaluation
        if (!activeSkillGapResult) {
          try {
            const priorEval = await fetchSkillEvaluationByResume(currentTargetId);
            if (isMounted && priorEval.ok && priorEval.data) {
              setResult(priorEval.data);
              setActiveSkillGap(priorEval.data);
            } else if (isMounted) {
              setResult(null);
            }
          } catch (e) {
            console.warn('Could not load initial skill evaluation:', e);
            if (isMounted) setResult(null);
          }
        }
      } else if (isMounted) {
        setSelectedResumeId(null);
        setResult(null);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [activeResumeId, activeSkillGapResult, activeTargetRole, setActiveSkillGap]);

  // Synchronize when context state changes
  useEffect(() => {
    setResult(activeSkillGapResult);
  }, [activeSkillGapResult]);

  useEffect(() => {
    setSelectedResumeId(activeResumeId);
  }, [activeResumeId]);

  useEffect(() => {
    setResumes(availableResumes);
  }, [availableResumes]);

  // When user selects a different resume, check if a prior evaluation exists for it
  const handleSelectResume = async (resumeId: number) => {
    setSelectedResumeId(resumeId);
    setError(null);

    // If activeSkillGapResult belongs to this resume, restore immediately
    if (activeSkillGapResult && activeSkillGapResult.resume_id === resumeId) {
      setResult(activeSkillGapResult);
      return;
    }

    // Check backend for prior evaluation of this resume
    setIsEvaluating(true);
    try {
      const priorEval = await fetchSkillEvaluationByResume(resumeId);
      if (priorEval.ok && priorEval.data) {
        setResult(priorEval.data);
        setActiveSkillGap(priorEval.data);
      } else {
        // No prior evaluation exists: clear result so user can click Analyze
        setResult(null);
      }
    } catch (e) {
      console.warn('Error checking prior evaluation for resume:', e);
      setResult(null);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExts = ['.pdf', '.docx', '.txt'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExts.some((ext) => lowerName.endsWith(ext));

    if (!isValid) {
      setError('Please upload a valid PDF, DOCX, or TXT document.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5MB maximum limit.');
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleEvaluate = async () => {
    setError(null);

    if (inputMode === 'reuse') {
      if (!selectedResumeId) {
        setError('Please select an analyzed resume or switch to upload mode.');
        return;
      }
    } else {
      if (!selectedFile) {
        setError('Please select or drop a resume file to evaluate.');
        return;
      }
    }

    setIsEvaluating(true);

    try {
      let res;
      if (inputMode === 'reuse' && selectedResumeId) {
        res = await evaluateSkillGapReuse(selectedRole, selectedResumeId);
      } else if (inputMode === 'upload' && selectedFile) {
        res = await evaluateSkillGapUpload(selectedRole, selectedFile);
      }

      if (res && res.ok && res.data) {
        setResult(res.data);
        setActiveSkillGap(res.data);
        setActiveTargetRole(selectedRole);
      } else {
        setError(res?.error || 'Skill gap evaluation failed. Please verify server connection.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during evaluation.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentRoleInfo = roles.find((r) => r.title === selectedRole);

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Module 02
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Active
            </span>
            {result && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                  result.analysis_mode === 'gemini_ai'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {result.analysis_mode === 'gemini_ai'
                  ? 'AI-Enhanced Analysis (Gemini)'
                  : 'Deterministic Skill Gap Engine (Offline)'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Skill Gap Analyzer
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Compare your verified technical profile against role benchmarks to discover learning priorities and high-impact project opportunities.
          </p>
        </div>

        {result && (
          <button
            type="button"
            onClick={handleReset}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-run Benchmark</span>
          </button>
        )}
      </div>

      {/* Input Configuration Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6">
        {/* Source Mode Tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-2">
            1. Select Candidate Profile Source
          </label>
          <div className="flex border-b border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => { setInputMode('reuse'); setError(null); }}
              className={`pb-2.5 px-4 font-semibold transition-all border-b-2 ${
                inputMode === 'reuse'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Reuse Analyzed Resume ({resumes.length})
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('upload'); setError(null); }}
              className={`pb-2.5 px-4 font-semibold transition-all border-b-2 ${
                inputMode === 'upload'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Upload New Resume
            </button>
          </div>
        </div>

        {/* Tab A Content: Reuse Existing Resume */}
        {inputMode === 'reuse' && (
          <div className="space-y-3">
            {isLoadingResumes ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
                Loading previously analyzed resumes...
              </div>
            ) : resumes.length > 0 ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
                  Choose a previously audited resume from your history:
                </label>
                <div className="relative">
                  <select
                    value={selectedResumeId ?? ''}
                    onChange={(e) => handleSelectResume(Number(e.target.value))}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900 appearance-none pr-9 shadow-2xs"
                  >
                    {resumes.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.filename} — Score: {Math.round(rec.score)}/100 ({rec.extracted_skills.length} skills detected, {rec.created_at})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">No analyzed resumes found in history.</span> You can switch to the <span className="font-semibold underline cursor-pointer" onClick={() => setInputMode('upload')}>Upload New Resume</span> tab above or audit a resume in the Resume Analyzer module first.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab B Content: Upload New Resume */}
        {inputMode === 'upload' && (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt"
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-slate-900 bg-slate-100/80'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 mx-auto mb-3 shadow-2xs">
                  <UploadCloud className="w-5 h-5 text-slate-600" />
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  Drop your resume here, or <span className="text-slate-900 underline">browse</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Supports PDF, DOCX, or TXT (Max 5MB)
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                    <FileText className="w-4 h-4 text-slate-700" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{selectedFile.name}</div>
                    <div className="text-[11px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Target Role Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            2. Choose Target Career Benchmark
          </label>
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900 appearance-none pr-9 shadow-2xs"
            >
              {roles.length > 0 ? (
                roles.map((r) => (
                  <option key={r.id} value={r.title}>
                    {r.title} ({r.core_skills_count} core, {r.complementary_skills_count} complementary)
                  </option>
                ))
              ) : (
                <>
                  <option value="Full Stack Developer">Full Stack Developer (Web & Cloud)</option>
                  <option value="Frontend Engineer">Frontend Engineer (React / TypeScript)</option>
                  <option value="Backend Engineer">Backend Engineer (APIs / Microservices)</option>
                  <option value="Machine Learning Engineer">Machine Learning Engineer (PyTorch / MLOps)</option>
                  <option value="Data Analyst / Scientist">Data Analyst / Scientist (SQL / Analytics)</option>
                  <option value="DevOps & Cloud Engineer">DevOps & Cloud Engineer (CI/CD / Docker)</option>
                </>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          {currentRoleInfo && (
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              {currentRoleInfo.description}
            </p>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className={`px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all ${
              isEvaluating
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isEvaluating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Evaluating Benchmark Coverage...</span>
              </>
            ) : (
              <>
                <GitFork className="w-4 h-4 text-white" />
                <span>Analyze Skill Gap</span>
              </>
            )}
          </button>

          <span className="text-[11px] text-slate-400">
            Application benchmark weighting: Core 65% / Complementary 35%
          </span>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 pt-2">
          {/* Active Evaluation Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-emerald-900">
                Active evaluation for <strong className="font-semibold">{result.resume_filename}</strong> against <strong className="font-semibold">{result.target_role}</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={isEvaluating}
              className="px-2.5 py-1 rounded bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold text-[11px] transition-colors"
            >
              Re-run Evaluation
            </button>
          </div>

          {/* Top Metrics Cards (3-Column Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric 1: Overall Coverage */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Overall Skill Coverage</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weighted</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                  {Math.round(result.metrics.overall_coverage)}%
                </span>
                <span className="text-xs text-slate-400 font-medium">/ 100 benchmark</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.metrics.overall_coverage >= 70
                      ? 'bg-emerald-600'
                      : result.metrics.overall_coverage >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(4, Math.min(100, result.metrics.overall_coverage))}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>{result.metrics.direct_match_count} direct • {result.metrics.adjacent_match_count} related</span>
                <span className="font-semibold text-slate-700">{result.metrics.missing_count} missing</span>
              </div>
            </div>

            {/* Metric 2: Core Competencies */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Core Competencies</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">65% Weight</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                  {Math.round(result.metrics.core_coverage)}%
                </span>
                <span className="text-xs text-slate-400 font-medium">aligned</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.metrics.core_coverage >= 70
                      ? 'bg-emerald-600'
                      : result.metrics.core_coverage >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(4, Math.min(100, result.metrics.core_coverage))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Primary engineering stack requirements essential for this role.
              </p>
            </div>

            {/* Metric 3: Complementary Skills */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Complementary Skills</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">35% Weight</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                  {Math.round(result.metrics.complementary_coverage)}%
                </span>
                <span className="text-xs text-slate-400 font-medium">aligned</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.metrics.complementary_coverage >= 70
                      ? 'bg-emerald-600'
                      : result.metrics.complementary_coverage >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(4, Math.min(100, result.metrics.complementary_coverage))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Differentiating toolchain, cloud workflows, and secondary frameworks.
              </p>
            </div>
          </div>

          {/* Competency Categorization (3 Distinct Sections) */}
          <div className="space-y-5">
            {/* Section 1: Direct Matches */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Direct Matches ({result.skills.direct_matches.length})
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Explicitly Supported by Resume
                </span>
              </div>

              {result.skills.direct_matches.length > 0 ? (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {result.skills.direct_matches.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50/80 text-emerald-900 border border-emerald-200 text-xs font-medium shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{item.name}</span>
                      <span className="text-[10px] text-emerald-600/80 font-normal">
                        ({item.category})
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No direct benchmark matches were identified in the candidate profile.
                </p>
              )}
            </div>

            {/* Section 2: Related / Adjacent Skills */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Related / Adjacent Skills ({result.skills.adjacent_skills.length})
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Transferable Foundations (50% Partial Credit)
                </span>
              </div>

              <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 p-3 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-2 transition-colors">
                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-semibold text-blue-950 dark:text-blue-100">Strict matching rule:</strong> Related competencies provide a conceptual foundation, but are <strong>not</strong> counted as direct matches until explicit verification is demonstrated.
                </span>
              </div>

              {result.skills.adjacent_skills.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {result.skills.adjacent_skills.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/30 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-blue-950 dark:text-blue-100">
                          {item.target_skill}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                          Transferred from {item.candidate_skill}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                        {item.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No partial or adjacent skill transfers were identified for this benchmark.
                </p>
              )}
            </div>

            {/* Section 3: Missing Competencies */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Missing Competencies ({result.skills.missing_skills.length})
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Prioritized by Hiring Impact
                </span>
              </div>

              {result.skills.missing_skills.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {result.skills.missing_skills.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.priority === 'High'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : item.priority === 'Medium'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.priority} Priority
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        {item.impact}
                      </p>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Category: {item.category} • Tier: {item.tier}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-700 font-medium">
                  Outstanding alignment! All standard benchmark requirements are present in the candidate profile.
                </p>
              )}
            </div>
          </div>

          {/* Actionable Learning & Project Direction Stack */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-800" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Recommended Learning & Practice Direction
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  Concept & Project Roadmaps (No arbitrary hours)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-1">
                {result.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{rec.skill}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rec.priority === 'High'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rec.priority} Priority
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-800">Why it matters: </span>
                      {rec.why_it_matters}
                    </p>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5 shadow-2xs">
                      <div>
                        <span className="font-semibold text-slate-900">Suggested Topics: </span>
                        <span>{rec.learning_direction}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Practice Project: </span>
                        <span>{rec.project_idea}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Benchmark Methodology & Transparency Callout */}
          <div className="rounded-xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3 transition-colors">
            <Info className="w-4 h-4 text-slate-500 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="leading-relaxed">
              <span className="font-bold text-slate-900 dark:text-white">Methodology &amp; Benchmark Transparency:</span>{' '}
              <span>{result.benchmark_notice} Individual employer screening requirements may vary. Custom job description comparison will be provided in a future update.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
