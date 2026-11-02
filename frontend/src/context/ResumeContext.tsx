import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ResumeAnalysisResult, ResumeRecord, SkillGapResult } from '../types';
import { fetchResumeById, fetchResumeHistory, fetchSkillEvaluationByResume } from '../services/api';
import { useAuth } from './AuthContext';

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

const getStorageKey = (prefix: string, uid: number | null): string => {
  return uid ? `${prefix}_u${uid}` : `${prefix}_guest`;
};

export const ResumeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user ? user.id : null;

  const [activeResumeId, setActiveResumeId] = useState<number | null>(null);
  const [activeTargetRole, setActiveTargetRoleState] = useState<string>('Full Stack Developer');
  const [activeResumeAnalysis, setActiveResumeAnalysis] = useState<ResumeAnalysisResult | null>(null);
  const [activeSkillGapResult, setActiveSkillGapResult] = useState<SkillGapResult | null>(null);
  const [availableResumes, setAvailableResumes] = useState<ResumeRecord[]>([]);
  const [isLoadingActiveResume, setIsLoadingActiveResume] = useState<boolean>(true);

  const setActiveTargetRole = useCallback((role: string) => {
    setActiveTargetRoleState(role);
    try {
      localStorage.setItem(getStorageKey(STORAGE_ACTIVE_ROLE, currentUserId), role);
    } catch {
      // Storage unavailable
    }
  }, [currentUserId]);

  const refreshAvailableResumes = useCallback(async () => {
    try {
      const res = await fetchResumeHistory();
      if (res.ok && res.data) {
        setAvailableResumes(res.data);
      } else {
        setAvailableResumes([]);
      }
    } catch (err) {
      console.error('Failed to load resume history:', err);
      setAvailableResumes([]);
    }
  }, []);

  const setActiveSkillGap = useCallback((result: SkillGapResult | null) => {
    setActiveSkillGapResult(result);
  }, []);

  const setActiveResume = useCallback((analysis: ResumeAnalysisResult | null) => {
    setActiveResumeAnalysis(analysis);
    const storageKey = getStorageKey(STORAGE_ACTIVE_RESUME_ID, currentUserId);
    if (analysis && analysis.id) {
      setActiveResumeId(analysis.id);
      try {
        localStorage.setItem(storageKey, String(analysis.id));
      } catch {
        // Storage unavailable
      }
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
        setActiveSkillGapResult(null);
      });
    } else {
      setActiveResumeId(null);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Storage unavailable
      }
      setActiveSkillGapResult(null);
    }
    // Refresh history so any newly created resume is in the list
    refreshAvailableResumes();
  }, [currentUserId, refreshAvailableResumes, setActiveTargetRole]);

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
    try {
      localStorage.removeItem(getStorageKey(STORAGE_ACTIVE_RESUME_ID, currentUserId));
    } catch {
      // Storage unavailable
    }
  }, [currentUserId]);

  // Synchronize and re-initialize state when user identity changes (login, logout, account switch)
  useEffect(() => {
    let isMounted = true;
    setIsLoadingActiveResume(true);

    // Immediately reset in-memory state so previous user data is never retained
    setActiveResumeAnalysis(null);
    setActiveResumeId(null);
    setActiveSkillGapResult(null);
    setAvailableResumes([]);

    // Restore user-specific role preference
    const roleKey = getStorageKey(STORAGE_ACTIVE_ROLE, currentUserId);
    try {
      const savedRole = localStorage.getItem(roleKey);
      if (savedRole && isMounted) {
        setActiveTargetRoleState(savedRole);
      } else if (isMounted) {
        setActiveTargetRoleState('Full Stack Developer');
      }
    } catch {
      // Ignore localStorage error
    }

    const initializeForUser = async () => {
      // 1. Fetch available resumes scoped to the current user
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
        console.error('Error fetching resume history on user change:', e);
      }

      // If user has NO resumes, ensure empty state and stop loading
      if (latestResumes.length === 0) {
        if (isMounted) {
          setActiveResumeId(null);
          setActiveResumeAnalysis(null);
          setActiveSkillGapResult(null);
          setIsLoadingActiveResume(false);
        }
        try {
          localStorage.removeItem(getStorageKey(STORAGE_ACTIVE_RESUME_ID, currentUserId));
        } catch {
          // Ignore
        }
        return;
      }

      // 2. Identify target resume ID to restore for this user
      const resumeStorageKey = getStorageKey(STORAGE_ACTIVE_RESUME_ID, currentUserId);
      let targetId: number | null = null;
      try {
        const savedId = localStorage.getItem(resumeStorageKey);
        if (savedId) {
          const parsed = parseInt(savedId, 10);
          // Confirm saved ID actually belongs to this user's available resumes
          if (latestResumes.some((r) => r.id === parsed)) {
            targetId = parsed;
          }
        }
      } catch {
        // Ignore
      }

      // Default to latest resume if no valid saved ID
      if (!targetId && latestResumes.length > 0) {
        targetId = latestResumes[0].id;
      }

      if (targetId && isMounted) {
        try {
          const res = await fetchResumeById(targetId);
          if (res.ok && res.data && isMounted) {
            setActiveResumeAnalysis(res.data);
            setActiveResumeId(res.data.id);
            try {
              localStorage.setItem(resumeStorageKey, String(res.data.id));
            } catch {
              // Ignore
            }

            // Also check for prior skill gap evaluation
            if (res.data.id) {
              const skillRes = await fetchSkillEvaluationByResume(res.data.id);
              if (skillRes.ok && skillRes.data && isMounted) {
                setActiveSkillGapResult(skillRes.data);
              } else if (isMounted) {
                setActiveSkillGapResult(null);
              }
            }
          } else if (isMounted) {
            try {
              localStorage.removeItem(resumeStorageKey);
            } catch {
              // Ignore
            }
          }
        } catch (err) {
          console.error(`Failed to restore active resume ${targetId}:`, err);
        }
      }

      if (isMounted) {
        setIsLoadingActiveResume(false);
      }
    };

    initializeForUser();

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

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
