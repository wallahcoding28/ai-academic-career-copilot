import { ApiResponse, HealthData, AuthUser, UserPreferences } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';

export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
}

export async function fetchBackendHealth(): Promise<{ ok: boolean; data?: HealthData; error?: string; latencyMs: number }> {
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await apiFetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return {
        ok: false,
        error: `Server responded with HTTP ${response.status}`,
        latencyMs,
      };
    }

    const result: ApiResponse<HealthData> = await response.json();
    if (result.success && result.data) {
      return {
        ok: true,
        data: result.data,
        latencyMs,
      };
    } else {
      return {
        ok: false,
        error: result.message || 'Malformed health response',
        latencyMs,
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'Connection timed out' : (err.message || 'Backend server unreachable'),
      latencyMs,
    };
  }
}

export async function analyzeResumeFile(
  file: File,
  targetRole: string
): Promise<{ ok: boolean; data?: import('../types').ResumeAnalysisResult; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_role', targetRole);

    const response = await apiFetch(`${API_BASE_URL}/resume/analyze`, {
      method: 'POST',
      body: formData,
    });

    const result: ApiResponse<import('../types').ResumeAnalysisResult> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to analyze resume' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with analyzer API' };
  }
}

export async function analyzeResumeText(
  text: string,
  targetRole: string
): Promise<{ ok: boolean; data?: import('../types').ResumeAnalysisResult; error?: string }> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/resume/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        target_role: targetRole,
        filename: 'manual_entry.txt',
      }),
    });

    const result: ApiResponse<import('../types').ResumeAnalysisResult> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to analyze resume' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with analyzer API' };
  }
}

export async function fetchResumeHistory(): Promise<{
  ok: boolean;
  data?: import('../types').ResumeRecord[];
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/resume/history`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const result: ApiResponse<import('../types').ResumeRecord[]> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to fetch resume history' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with API' };
  }
}

export async function fetchResumeById(resumeId: number): Promise<{
  ok: boolean;
  data?: import('../types').ResumeAnalysisResult;
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/resume/${resumeId}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const result: ApiResponse<import('../types').ResumeAnalysisResult> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || `Failed to fetch resume ${resumeId}` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with API' };
  }
}

export async function fetchSkillEvaluationByResume(resumeId: number): Promise<{
  ok: boolean;
  data?: import('../types').SkillGapResult | null;
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/skills/evaluation-by-resume/${resumeId}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const result: ApiResponse<import('../types').SkillGapResult | null> = await response.json();
    if (response.ok && result.success) {
      const hasData = result.data && typeof result.data === 'object' && Object.keys(result.data).length > 0;
      return { ok: true, data: hasData ? result.data : null };
    }
    return { ok: false, error: result.message || `Failed to fetch skill evaluation for resume ${resumeId}` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with API' };
  }
}

export async function fetchRoleBenchmarks(): Promise<{
  ok: boolean;
  data?: import('../types').RoleBenchmarkSummary[];
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/skills/roles`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const result: ApiResponse<{ roles: import('../types').RoleBenchmarkSummary[] }> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data.roles };
    }
    return { ok: false, error: result.message || 'Failed to fetch role benchmarks' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with API' };
  }
}

export async function evaluateSkillGapReuse(
  targetRole: string,
  resumeId: number
): Promise<{ ok: boolean; data?: import('../types').SkillGapResult; error?: string }> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/skills/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_role: targetRole,
        resume_id: resumeId,
      }),
    });
    const result: ApiResponse<import('../types').SkillGapResult> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to evaluate skill gap' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with API' };
  }
}

export async function evaluateSkillGapUpload(
  targetRole: string,
  file: File
): Promise<{ ok: boolean; data?: import('../types').SkillGapResult; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_role', targetRole);

    const response = await apiFetch(`${API_BASE_URL}/skills/evaluate`, {
      method: 'POST',
      body: formData,
    });
    const result: ApiResponse<import('../types').SkillGapResult> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to evaluate skill gap' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with API' };
  }
}

export async function fetchSkillGapHistory(): Promise<{
  ok: boolean;
  data?: import('../types').SkillGapHistoryRecord[];
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/skills/history`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const result: ApiResponse<import('../types').SkillGapHistoryRecord[]> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to fetch skill gap history' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with API' };
  }
}

export async function fetchInterviewRoles(): Promise<{
  ok: boolean;
  data?: import('../types').InterviewRoleSummary[];
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/interview/roles`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const result: ApiResponse<{ roles: import('../types').InterviewRoleSummary[] }> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data.roles };
    }
    return { ok: false, error: result.message || 'Failed to fetch interview benchmark roles' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with API' };
  }
}

export async function generateInterviewQuestions(
  payload: import('../types').InterviewGeneratePayload
): Promise<{
  ok: boolean;
  data?: import('../types').InterviewSession;
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/interview/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result: ApiResponse<import('../types').InterviewSession> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to generate interview questions' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with interview API' };
  }
}

export async function fetchInterviewHistory(): Promise<{
  ok: boolean;
  data?: import('../types').InterviewHistoryRecord[];
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/interview/history`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const result: ApiResponse<import('../types').InterviewHistoryRecord[]> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to fetch interview history' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with API' };
  }
}

export async function fetchStudyPlannerContext(): Promise<{
  ok: boolean;
  data?: import('../types').StudyPlannerContext;
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/study-planner/context`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const result: ApiResponse<import('../types').StudyPlannerContext> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to fetch study planner context' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with study planner API' };
  }
}

export async function generateStudyPlan(
  payload: import('../types').StudyPlanGeneratePayload
): Promise<{
  ok: boolean;
  data?: import('../types').StudyPlan;
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/study-planner/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result: ApiResponse<import('../types').StudyPlan> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to generate study plan' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with study planner API' };
  }
}

export async function fetchStudyPlansHistory(limit: number = 20): Promise<{
  ok: boolean;
  data?: import('../types').StudyPlanHistoryRecord[];
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/study-planner/history?limit=${limit}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const result: ApiResponse<import('../types').StudyPlanHistoryRecord[]> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to fetch study plans history' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with API' };
  }
}

export async function fetchStudyPlanById(planId: number): Promise<{
  ok: boolean;
  data?: import('../types').StudyPlan;
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/study-planner/${planId}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const result: ApiResponse<import('../types').StudyPlan> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to fetch study plan' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with study planner API' };
  }
}

export async function toggleStudySessionCompletion(
  planId: number,
  sessionId: number,
  isCompleted: boolean
): Promise<{
  ok: boolean;
  data?: { session: import('../types').StudySession; plan_completed_sessions: number };
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/study-planner/${planId}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_completed: isCompleted }),
    });
    const result: ApiResponse<{ session: import('../types').StudySession; plan_completed_sessions: number }> =
      await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to update session completion' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with study planner API' };
  }
}

export async function regenerateStudyPlan(
  planId: number,
  payload: {
    daily_hours?: number;
    horizon_weeks?: number;
    topics?: string[];
    study_preferences?: import('../types').StudyPreferences;
  }
): Promise<{
  ok: boolean;
  data?: import('../types').StudyPlan;
  error?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/study-planner/${planId}/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result: ApiResponse<import('../types').StudyPlan> = await response.json();
    if (response.ok && result.success && result.data) {
      return { ok: true, data: result.data };
    }
    return { ok: false, error: result.message || 'Failed to regenerate study plan' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error communicating with study planner API' };
  }
}

// =============================================================================
// Authentication & User Account Management Endpoints
// =============================================================================

export async function signupUser(payload: {
  name: string;
  email: string;
  password: string;
  college?: string;
  target_role?: string;
  degree_program?: string;
  graduation_year?: number;
}): Promise<{ ok: boolean; data?: AuthUser; error?: string }> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result: ApiResponse<{ user: AuthUser }> = await response.json();
    if (response.ok && result.success && result.data?.user) {
      return { ok: true, data: result.data.user };
    }
    return { ok: false, error: result.message || 'Failed to create account.' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during signup.' };
  }
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<{ ok: boolean; data?: AuthUser; error?: string }> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result: ApiResponse<{ user: AuthUser }> = await response.json();
    if (response.ok && result.success && result.data?.user) {
      return { ok: true, data: result.data.user };
    }
    return { ok: false, error: result.message || 'Invalid email or password.' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during login.' };
  }
}

export async function logoutUser(): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const result: ApiResponse<any> = await response.json();
    return { ok: response.ok && result.success };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during logout.' };
  }
}

export async function fetchCurrentUser(): Promise<{ ok: boolean; data?: AuthUser | null; error?: string }> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (response.status === 401) {
      return { ok: true, data: null };
    }
    const result: ApiResponse<{ user: AuthUser }> = await response.json();
    if (response.ok && result.success && result.data?.user) {
      return { ok: true, data: result.data.user };
    }
    return { ok: false, data: null, error: result.message };
  } catch (err: any) {
    return { ok: false, data: null, error: err.message || 'Network error.' };
  }
}

export async function updateUserProfile(payload: {
  name?: string;
  college?: string;
  target_role?: string;
  degree_program?: string;
  graduation_year?: number;
}): Promise<{ ok: boolean; data?: AuthUser; error?: string }> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result: ApiResponse<{ user: AuthUser }> = await response.json();
    if (response.ok && result.success && result.data?.user) {
      return { ok: true, data: result.data.user };
    }
    return { ok: false, error: result.message || 'Failed to update profile.' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error updating profile.' };
  }
}

export async function changeUserPassword(payload: {
  current_password: string;
  new_password: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/auth/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result: ApiResponse<any> = await response.json();
    if (response.ok && result.success) {
      return { ok: true };
    }
    return { ok: false, error: result.message || 'Failed to update password.' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error updating password.' };
  }
}

export async function updateUserPreferences(
  preferences: UserPreferences
): Promise<{ ok: boolean; data?: UserPreferences; error?: string }> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/auth/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences }),
    });
    const result: ApiResponse<{ preferences: UserPreferences }> = await response.json();
    if (response.ok && result.success && result.data?.preferences) {
      return { ok: true, data: result.data.preferences };
    }
    return { ok: false, error: result.message || 'Failed to save preferences.' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error saving preferences.' };
  }
}

export async function deleteUserData(
  confirmation: 'DELETE_ALL_DATA' | 'DELETE_ACCOUNT'
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/auth/data`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation }),
    });
    const result: ApiResponse<any> = await response.json();
    if (response.ok && result.success) {
      return { ok: true };
    }
    return { ok: false, error: result.message || 'Failed to delete data.' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error deleting data.' };
  }
}



