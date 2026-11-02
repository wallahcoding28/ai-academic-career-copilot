import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ResumeAnalysisResult, ResumeRecord, SkillGapResult } from '../types';
import { fetchResumeById, fetchResumeHistory, fetchSkillEvaluationByResume } from '../services/api';

interface ResumeContextType {
  activeResumeId: number | null;
  activeResumeAnalysis: ResumeAnalysisResult | null;
  activeSkillGapResult: SkillGapResult | null;
  activeTargetRole: string;
  availableResumes: ResumeRecord[];
  isLoadingActiveResume: boolean;
  setActiveResume: (analysis: ResumeAnalysisResult | null) => void;
  selectResumeById: (resumeId: number) => Promise<boolean>;
  setActiveSkillGap: (result: SkillGapResult | null) => void;
  setActiveTargetRole: (role: string) => void;
  clearActiveResume: () => void;
  refreshAvailableResumes: () => Promise<void>;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

const STORAGE_ACTIVE_RESUME_ID = 'copilot_active_resume_id';
const STORAGE_ACTIVE_ROLE = 'copilot_active_role';

export const ResumeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeResumeId, setActiveResumeId] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_ACTIVE_RESUME_ID);
    return saved ? parseInt(saved, 10) : null;
  });

  const [activeTargetRole, setActiveTargetRoleState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_ACTIVE_ROLE) || 'Full Stack Developer';
  });

  const [activeResumeAnalysis, setActiveResumeAnalysis] = useState<ResumeAnalysisResult | null>(null);
  const [activeSkillGapResult, setActiveSkillGapResult] = useState<SkillGapResult | null>(null);
  const [availableResumes, setAvailableResumes] = useState<ResumeRecord[]>([]);
  const [isLoadingActiveResume, setIsLoadingActiveResume] = useState<boolean>(true);

  const setActiveTargetRole = useCallback((role: string) => {
    setActiveTargetRoleState(role);
    localStorage.setItem(STORAGE_ACTIVE_ROLE, role);
  }, []);

  const refreshAvailableResumes = useCallback(async () => {
    try {
      const res = await fetchResumeHistory();
      if (res.ok && res.data) {
        setAvailableResumes(res.data);
      }
    } catch (err) {
      console.error('Failed to load resume history:', err);
    }
  }, []);

  const setActiveSkillGap = useCallback((result: SkillGapResult | null) => {
    setActiveSkillGapResult(result);
  }, []);

  const setActiveResume = useCallback((analysis: ResumeAnalysisResult | null) => {
    setActiveResumeAnalysis(analysis);
    if (analysis && analysis.id) {
      setActiveResumeId(analysis.id);
      localStorage.setItem(STORAGE_ACTIVE_RESUME_ID, String(analysis.id));
      if (analysis.target_role) {
        setActiveTargetRole(analysis.target_role);
      }

      // Check if there is an existing skill gap evaluation for this resume
      fetchSkillEvaluationByResume(analysis.id).then((skillRes) => {
        if (skillRes.ok && skillRes.data) {
          setActiveSkillGapResult(skillRes.data);
        } else {
          setActiveSkillGapResult(null);
        }
      }).catch((e) => {
        console.warn('Could not fetch prior skill evaluation for resume:', e);
      });
    } else {
      setActiveResumeId(null);
      localStorage.removeItem(STORAGE_ACTIVE_RESUME_ID);
      setActiveSkillGapResult(null);
    }
    // Refresh history so any newly created resume is in the list
    refreshAvailableResumes();
  }, [refreshAvailableResumes, setActiveTargetRole]);

  const selectResumeById = useCallback(async (resumeId: number): Promise<boolean> => {
    setIsLoadingActiveResume(true);
    try {
      const res = await fetchResumeById(resumeId);
      if (res.ok && res.data) {
        setActiveResume(res.data);
        setIsLoadingActiveResume(false);
        return true;
      }
      setIsLoadingActiveResume(false);
      return false;
    } catch (err) {
      console.error(`Failed to select resume ${resumeId}:`, err);
      setIsLoadingActiveResume(false);
      return false;
    }
  }, [setActiveResume]);

  const clearActiveResume = useCallback(() => {
    setActiveResumeAnalysis(null);
    setActiveResumeId(null);
    setActiveSkillGapResult(null);
    localStorage.removeItem(STORAGE_ACTIVE_RESUME_ID);
  }, []);

  // Initial restoration on page load / mount
  useEffect(() => {
    let isMounted = true;

    const initializeActiveResume = async () => {
      setIsLoadingActiveResume(true);

      // 1. Fetch available resumes from history
      let latestResumes: ResumeRecord[] = [];
      try {
        const histRes = await fetchResumeHistory();
        if (histRes.ok && histRes.data) {
          latestResumes = histRes.data;
          if (isMounted) {
            setAvailableResumes(histRes.data);
          }
        }
      } catch (e) {
        console.error('Error fetching resume history on mount:', e);
      }

      // 2. Identify target resume ID to restore
      const savedId = localStorage.getItem(STORAGE_ACTIVE_RESUME_ID);
      let targetId: number | null = savedId ? parseInt(savedId, 10) : null;

      // If no ID was saved in localStorage, but history has resumes, restore the latest one
      if (!targetId && latestResumes.length > 0) {
        targetId = latestResumes[0].id;
      }

      if (targetId) {
        try {
          const res = await fetchResumeById(targetId);
          if (res.ok && res.data && isMounted) {
            setActiveResumeAnalysis(res.data);
            setActiveResumeId(res.data.id);
            localStorage.setItem(STORAGE_ACTIVE_RESUME_ID, String(res.data.id));

            // Also check for prior skill gap evaluation
            if (res.data.id) {
              const skillRes = await fetchSkillEvaluationByResume(res.data.id);
              if (skillRes.ok && skillRes.data && isMounted) {
                setActiveSkillGapResult(skillRes.data);
              }
            }
          } else if (isMounted) {
            // Target ID was not found (e.g. deleted or stale)
            localStorage.removeItem(STORAGE_ACTIVE_RESUME_ID);
          }
        } catch (err) {
          console.error(`Failed to restore active resume ${targetId}:`, err);
        }
      }

      if (isMounted) {
        setIsLoadingActiveResume(false);
      }
    };

    initializeActiveResume();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ResumeContext.Provider
      value={{
        activeResumeId,
        activeResumeAnalysis,
        activeSkillGapResult,
        activeTargetRole,
        availableResumes,
        isLoadingActiveResume,
        setActiveResume,
        selectResumeById,
        setActiveSkillGap,
        setActiveTargetRole,
        clearActiveResume,
        refreshAvailableResumes,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
};

export const useResume = (): ResumeContextType => {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
};

