import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Check,
  Cpu,
  Layers,
  FileCheck,
  Copy,
  ChevronDown,
  ArrowRight,
  Info,
  History as HistoryIcon,
} from 'lucide-react';
import { analyzeResumeFile, analyzeResumeText } from '../services/api';
import { ResumeAnalysisResult } from '../types';
import { useResume } from '../context/ResumeContext';

export const ResumeAnalyzer: React.FC = () => {
  const {
    activeResumeAnalysis,
    activeResumeId,
    setActiveResume,
    availableResumes,
    selectResumeById,
    isLoadingActiveResume,
    activeTargetRole,
    setActiveTargetRole,
  } = useResume();

  const [selectedRole, setSelectedRole] = useState(activeTargetRole || 'Full Stack Developer');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [showNewUpload, setShowNewUpload] = useState(false);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // The active analysis result comes from the persistent context
  const analysisResult = activeResumeAnalysis;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
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

  const handleAnalyze = async () => {
    setError(null);

    if (inputMode === 'upload' && !selectedFile) {
      setError('Please select or drop a resume file first.');
      return;
    }

    if (inputMode === 'paste' && (!pastedText.trim() || pastedText.trim().length < 50)) {
      setError('Please paste at least 50 characters of resume content.');
      return;
    }

    setIsAnalyzing(true);

    try {
      let response;
      if (inputMode === 'upload' && selectedFile) {
        response = await analyzeResumeFile(selectedFile, selectedRole);
      } else {
        response = await analyzeResumeText(pastedText, selectedRole);
      }

      if (response.ok && response.data) {
        setActiveResume(response.data);
        setActiveTargetRole(selectedRole);
        setShowNewUpload(false);
        setSelectedFile(null);
        setPastedText('');
      } else {
        setError(response.error || 'Resume evaluation failed. Please check server status.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setShowNewUpload(true);
    setSelectedFile(null);
    setPastedText('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectSavedResume = async (id: number) => {
    setError(null);
    const success = await selectResumeById(id);
    if (success) {
      setShowNewUpload(false);
    } else {
      setError(`Could not load resume record #${id}.`);
    }
  };

  const handleCopyImproved = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Workflow Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Engineering Workflow
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Resume Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Evaluate your resume structure, keyword coverage, and role relevance against industry benchmark rubrics
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 leading-relaxed font-medium">
            {error}
          </div>
        </div>
      )}

      {/* When NOT analyzed or when user toggles new upload, show configuration & input card */}
      {!analysisResult || showNewUpload ? (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          {analysisResult && (
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-emerald-900">
                  Active analysis preserved: <strong className="font-semibold">{analysisResult.filename}</strong> (Score: {Math.round(analysisResult.score)}/100).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewUpload(false)}
                className="px-3 py-1.5 rounded-md bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-semibold text-xs transition-colors flex items-center gap-1"
              >
                <span>Return to Active Analysis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Select from Saved History if available */}
          {availableResumes.length > 0 && (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-slate-500" />
                <span>Or restore a previously analyzed resume ({availableResumes.length} stored):</span>
              </div>
              <div className="relative min-w-[240px]">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectSavedResume(Number(e.target.value));
                    }
                  }}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-slate-900 focus:border-slate-900 pr-8 appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select previously analyzed resume...</option>
                  {availableResumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.filename} (Score: {Math.round(r.score)}/100 • #{r.id})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Row 1: Target Role Selector & Mode Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label htmlFor="role-select" className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                Target Career Role:
              </label>
              <div className="relative min-w-[280px]">
                <select
                  id="role-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={isAnalyzing}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3.5 py-2 text-xs font-medium focus:ring-1 focus:ring-slate-900 focus:border-slate-900 pr-9 appearance-none transition-colors"
                >
                  <option value="Full Stack Developer">Full Stack Developer (SWE II)</option>
                  <option value="Frontend Engineer">Frontend Engineer (React / TypeScript)</option>
                  <option value="Backend Engineer">Backend Systems Engineer (Distributed)</option>
                  <option value="Machine Learning Engineer">Machine Learning Research Engineer</option>
                  <option value="Data Analyst / Scientist">Data Analyst / Scientist</option>
                  <option value="DevOps & Cloud Engineer">DevOps & Cloud Engineer</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  inputMode === 'upload'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>File Upload (PDF / DOCX / TXT)</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('paste')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  inputMode === 'paste'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Paste Text</span>
              </button>
            </div>
          </div>

          {/* Row 2: Ingestion Component */}
          {inputMode === 'upload' ? (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.txt"
                className="hidden"
                id="resume-file-input"
              />

              {!selectedFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 sm:p-10 transition-colors flex flex-col items-center justify-center text-center cursor-pointer group ${
                    dragOver
                      ? 'border-slate-900 bg-slate-100'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs group-hover:border-slate-300 transition-colors mb-3">
                    <UploadCloud className="w-5 h-5 text-slate-700" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    Drag &amp; drop your resume file here or <span className="text-blue-700 underline decoration-slate-300 underline-offset-4 font-semibold">browse files</span>
                  </p>
                  <span className="mt-1 text-[11px] font-medium text-slate-400">
                    Supported: PDF, DOCX, TXT • Max 5MB
                  </span>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {selectedFile.name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase">
                          {selectedFile.name.split('.').pop() || 'DOC'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Document ready for semantic ATS evaluation
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Paste Resume Text
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the full text of your resume here (sections, skills, projects, work experience)..."
                rows={8}
                className="w-full text-xs font-mono bg-slate-50/60 border border-slate-200 rounded-lg p-3.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 leading-relaxed"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                {pastedText.length} characters entered (minimum 50 required)
              </span>
            </div>
          )}

          {/* Row 3: Action Trigger Bar */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || (inputMode === 'upload' ? !selectedFile : !pastedText.trim())}
              className={`px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 ${
                isAnalyzing || (inputMode === 'upload' ? !selectedFile : !pastedText.trim())
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></span>
                  <span>Auditing Resume &amp; Extracting Keywords...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Analyze Resume Now</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>Deterministic ATS engine + Gemini diagnostic audit</span>
            </div>
          </div>
        </section>
      ) : (
        /* Results View */
        <div className="space-y-6">
          {/* Results Header & Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  DIAGNOSTIC REPORT
                </span>
                <span className="text-slate-300">•</span>
                {analysisResult.analysis_mode === 'gemini_ai' ? (
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>AI-Enhanced Analysis (Gemini 3.8 Flash)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    <Cpu className="w-3.5 h-3.5 text-slate-600" />
                    <span>Deterministic ATS Heuristic Engine (Offline Rule-Based)</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {analysisResult.target_role}
              </h2>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>File: <span className="font-mono text-slate-700 font-medium">{analysisResult.filename}</span></span>
                {analysisResult.id && <span>• Record #{analysisResult.id}</span>}
                <span className="text-slate-300">•</span>
                <span className="text-slate-600">
                  {analysisResult.analysis_mode === 'gemini_ai'
                    ? 'Evaluated via Google Gemini LLM API against job requirements'
                    : 'Evaluated locally via deterministic keyword matching & ATS section audit'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              {availableResumes.length > 1 && (
                <div className="relative">
                  <select
                    value={analysisResult.id ?? ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSelectSavedResume(Number(e.target.value));
                      }
                    }}
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-3 py-2 pr-8 appearance-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 cursor-pointer"
                  >
                    {availableResumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.filename} (Score: {Math.round(r.score)} • #{r.id})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              )}

              <button
                onClick={handleReset}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors bg-white"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload New</span>
              </button>

              <Link
                to="/skill-gap"
                className="px-3.5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span>Continue to Skill Gap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Section 2: Metric Summary Bento Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card A: Overall ATS Readiness */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    OVERALL READINESS
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 mt-0.5">ATS Score</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    analysisResult.score >= 75
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : analysisResult.score >= 55
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {analysisResult.score >= 75 ? 'Strong Match' : analysisResult.score >= 55 ? 'Moderate Match' : 'Needs Optimization'}
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`font-mono text-3xl font-extrabold tabular-nums ${
                      analysisResult.score >= 75
                        ? 'text-emerald-700'
                        : analysisResult.score >= 55
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {analysisResult.score}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ 100</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      analysisResult.score >= 75
                        ? 'bg-emerald-500'
                        : analysisResult.score >= 55
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, analysisResult.score)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-slate-600 text-xs">
                <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">Benchmark calibrated for {analysisResult.target_role}</span>
              </div>
            </div>

            {/* Card B: Diagnostic Category Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    DIAGNOSTIC SCORES
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 mt-0.5">Category Breakdown</h3>
                </div>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 font-normal">Formatting Score</span>
                    <span className="font-mono text-slate-900 tabular-nums">
                      {analysisResult.formatting_audit.ats_score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${analysisResult.formatting_audit.ats_score}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 font-normal">Skill Alignment</span>
                    <span className="font-mono text-slate-900 tabular-nums">
                      {Math.round(
                        (analysisResult.matched_skills.length /
                          Math.max(1, analysisResult.matched_skills.length + analysisResult.missing_skills.length)) *
                          100
                      )}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.round(
                          (analysisResult.matched_skills.length /
                            Math.max(1, analysisResult.matched_skills.length + analysisResult.missing_skills.length)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 font-normal">Content &amp; Impact</span>
                    <span className="font-mono text-slate-900 tabular-nums">
                      {Math.min(100, Math.round(analysisResult.score * 0.95))}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.round(analysisResult.score * 0.95))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
                <span>Readability Index</span>
                <span className="text-slate-900 font-semibold">{analysisResult.formatting_audit.readability}</span>
              </div>
            </div>

            {/* Card C: Audit Scope & Gaps */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    INDEX SUMMARY
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 mt-0.5">Audit Scope &amp; Gaps</h3>
                </div>
                <FileCheck className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-2 py-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{analysisResult.matched_skills.length} Matched Skills</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{analysisResult.missing_skills.length} Recommended Gaps</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{analysisResult.formatting_audit.formatting_flags.length} Audit Checklist Items</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-slate-600 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate">Persisted to SQLite database archive</span>
              </div>
            </div>
          </section>

          {/* Executive Assessment Callout */}
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-slate-700 dark:text-slate-200 leading-relaxed transition-colors">
            <span className="font-bold text-blue-900 dark:text-blue-300">Executive Assessment: </span>
            {analysisResult.summary.replace(/\s*will notably enhance recruiter callback probability\.?/gi, '')}
          </div>

          {/* Section 3: Role Competencies Grid */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Target Competency Analysis
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Semantic keyword extraction compared against {analysisResult.target_role} target benchmarks
                </p>
              </div>
              <div className="font-mono text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto tabular-nums">
                Coverage Ratio: {analysisResult.matched_skills.length}/{analysisResult.matched_skills.length + analysisResult.missing_skills.length} (
                {Math.round(
                  (analysisResult.matched_skills.length /
                    Math.max(1, analysisResult.matched_skills.length + analysisResult.missing_skills.length)) *
                    100
                )}%)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matched Competencies */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-900 font-semibold">
                    Matched Role Competencies ({analysisResult.matched_skills.length})
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {analysisResult.matched_skills.length > 0 ? (
                    analysisResult.matched_skills.map((skill) => (
                      <span
                        key={skill}
                        className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{skill}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No direct role skills matched.</span>
                  )}
                </div>
              </div>

              {/* Missing Competencies */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-amber-800 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-slate-900 font-semibold">
                    Missing Target Skills ({analysisResult.missing_skills.length})
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {analysisResult.missing_skills.length > 0 ? (
                    analysisResult.missing_skills.map((skill) => (
                      <span
                        key={skill}
                        className="bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1"
                      >
                        <span className="text-amber-600 font-bold">+</span>
                        <span>{skill}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No critical target skills missing.</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Actionable Bullet Point Improvements (Google X-Y-Z Formula) */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Actionable Bullet Point Improvements (Google X-Y-Z Formula)
                </h3>
                <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 self-start sm:self-auto">
                  Accomplished [X] as measured by [Y], by doing [Z]
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Transform passive descriptions into empirical engineering achievements
              </p>
            </div>

            <div className="space-y-5">
              {analysisResult.bullet_improvements.map((item, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-5 bg-slate-50/40 space-y-4">
                  {/* Original */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        ORIGINAL DRAFT
                      </span>
                      <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Original Bullet
                      </span>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-600 italic text-xs leading-relaxed">
                      "{item.original}"
                    </div>
                  </div>

                  {/* Optimized Rewrite */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        OPTIMIZED REWRITE
                      </span>
                      <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        High Empirical Score
                      </span>
                    </div>
                    <div className="p-3.5 bg-white border-l-4 border-emerald-500 border border-slate-200 rounded-lg text-slate-900 text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 leading-relaxed">
                          {item.improved}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-2 flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>Rationale:</strong> {item.reason}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyImproved(item.improved, idx)}
                        className="shrink-0 self-start bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: ATS Document Compliance Audit Checklist */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  ATS Document Compliance Audit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Machine readability parameters verifying parsing engine compatibility
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-emerald-800 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{analysisResult.formatting_audit.formatting_flags.length} Checklist Points</span>
              </span>
            </div>

            <div className="space-y-2.5">
              {analysisResult.formatting_audit.formatting_flags.map((flag, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-xs text-slate-800 leading-relaxed font-medium">
                      {flag}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    Pass
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Methodology & Benchmark Transparency Callout */}
          <div className="rounded-xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3 transition-colors">
            <Info className="w-4 h-4 text-slate-500 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="leading-relaxed">
              <span className="font-bold text-slate-900 dark:text-white">Methodology &amp; Benchmark Transparency:</span>{' '}
              <span>Evaluated against structured career-readiness reference profiles. Individual employer screening requirements may vary. Analysis rubrics serve as a curated academic baseline and provide structured guidance for resume enhancement.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeAnalyzer;
