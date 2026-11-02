export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  error: { code?: number; message: string } | null;
}

export interface HealthData {
  status: string;
  service: string;
  stage: string;
  version: string;
  timestamp: number;
  database: {
    status: string;
    path: string | null;
    details?: {
      tables_count: number;
      tables: string[];
    };
  };
  modules: Record<string, string>;
}

export interface StudentProfile {
  name: string;
  title: string;
  college: string;
  targetRole: string;
  graduationYear: number;
}

export interface NavItem {
  name: string;
  path: string;
  icon: string;
  badge?: string;
  stageTag?: string;
  activeInStage: number;
}

export interface BulletImprovement {
  original: string;
  improved: string;
  reason: string;
}

export interface FormattingAudit {
  readability: string;
  ats_score: number;
  formatting_flags: string[];
}

export interface ResumeAnalysisResult {
  id: number | null;
  filename: string;
  file_size: number;
  target_role: string;
  analysis_mode: 'gemini_ai' | 'ats_heuristic' | string;
  score: number;
  summary: string;
  matched_skills: string[];
  missing_skills: string[];
  bullet_improvements: BulletImprovement[];
  formatting_audit: FormattingAudit;
}

export interface ResumeRecord {
  id: number;
  filename: string;
  file_size: number;
  score: number;
  extracted_skills: string[];
  feedback: Partial<ResumeAnalysisResult>;
  created_at: string;
}

export interface RoleBenchmarkSummary {
  id: string;
  title: string;
  description: string;
  core_skills_count: number;
  complementary_skills_count: number;
  categories: string[];
}

export interface DirectMatchedSkill {
  name: string;
  tier: 'core' | 'complementary' | string;
  category: string;
  evidence: string;
}

export interface AdjacentSkill {
  target_skill: string;
  candidate_skill: string;
  tier: 'core' | 'complementary' | string;
  category: string;
  rationale: string;
}

export interface MissingSkill {
  name: string;
  tier: 'core' | 'complementary' | string;
  priority: 'High' | 'Medium' | 'Low' | string;
  category: string;
  impact: string;
}

export interface SkillLearningRecommendation {
  skill: string;
  priority: 'High' | 'Medium' | 'Low' | string;
  why_it_matters: string;
  learning_direction: string;
  project_idea: string;
}

export interface SkillGapMetrics {
  overall_coverage: number;
  core_coverage: number;
  complementary_coverage: number;
  total_benchmark_skills: number;
  direct_match_count: number;
  adjacent_match_count: number;
  missing_count: number;
}

export interface SkillGapResult {
  id: number | null;
  target_role: string;
  analysis_mode: 'gemini_ai' | 'deterministic_benchmark' | string;
  source_type: 'resume_reuse' | 'resume_upload' | string;
  resume_id?: number | null;
  resume_filename: string;
  metrics: SkillGapMetrics;
  skills: {
    direct_matches: DirectMatchedSkill[];
    adjacent_skills: AdjacentSkill[];
    missing_skills: MissingSkill[];
  };
  recommendations: SkillLearningRecommendation[];
  benchmark_notice: string;
}

export interface SkillGapHistoryRecord {
  id: number;
  resume_id?: number | null;
  target_role: string;
  match_percentage: number;
  core_coverage: number;
  complementary_coverage: number;
  source_type: string;
  analysis_mode: string;
  resume_filename: string;
  current_skills: string[];
  matched_skills: DirectMatchedSkill[];
  adjacent_skills: AdjacentSkill[];
  missing_skills: MissingSkill[];
  recommendations: SkillLearningRecommendation[];
  created_at: string;
}
export interface InterviewRoleSummary {
  id: string;
  title: string;
  description: string;
  core_skills?: string[];
  core_skills_count: number;
  complementary_skills_count: number;
}

export interface InterviewQuestion {
  question_number: number;
  question: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  skill_or_topic: string;
  guidance: string[];
  context_note?: string | null;
}

export interface InterviewSession {
  id: number;
  target_role: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  question_focus: string;
  selected_skills: string[];
  question_count: number;
  context_source: 'none' | 'resume' | 'skill_gap' | string;
  resume_id?: number | null;
  skill_gap_id?: number | null;
  generation_mode: 'gemini_ai' | 'deterministic_engine' | string;
  generation_mode_label: 'AI-Generated' | 'Offline Question Engine' | string;
  categories: string[];
  questions: InterviewQuestion[];
  created_at?: string;
}

export interface InterviewGeneratePayload {
  target_role: string;
  difficulty: string;
  question_focus: string;
  selected_skills: string[];
  question_count: number;
  context_source: 'none' | 'resume' | 'skill_gap';
  resume_id?: number | null;
  skill_gap_id?: number | null;
}

export interface InterviewHistoryRecord {
  id: number;
  target_role: string;
  difficulty: string;
  question_focus: string;
  selected_skills: string[];
  question_count: number;
  context_source: string;
  resume_id?: number | null;
  skill_gap_id?: number | null;
  generation_mode: string;
  generation_mode_label: string;
  categories: string[];
  questions: InterviewQuestion[];
  created_at: string;
}

export interface StudySession {
  id: number;
  plan_id: number;
  week_number: number;
  day_number: number;
  sequence_order: number;
  topic: string;
  session_objective: string;
  activity_type: 'Learn' | 'Practice' | 'Learn & Practice' | 'Review & Quiz' | 'Project Work' | 'Rest' | string;
  duration_minutes: number;
  priority: 'core_gap' | 'high' | 'standard' | 'revision' | 'buffer' | string;
  resource_hints: string[];
  is_completed: boolean;
  completed_at?: string | null;
}

export interface StudyPlanSummary {
  total_weeks: number;
  total_days: number;
  study_sessions_count: number;
  rest_days_count: number;
  total_planned_hours: number;
  weekly_hours: number;
  topics: string[];
}

export interface StudyPreferences {
  pacing?: 'balanced' | 'intensive' | string;
  rest_days_mode?: 'weekends_off' | 'daily' | 'one_day_off' | string;
  include_revision?: boolean;
}

export interface StudyPlan {
  id: number;
  user_id?: number | null;
  parent_plan_id?: number | null;
  version: number;
  title: string;
  goal: string;
  topics: string[];
  context_source: 'skill_gap' | 'interview' | 'resume' | 'custom' | string;
  skill_gap_id?: number | null;
  interview_session_id?: number | null;
  resume_id?: number | null;
  daily_hours: number;
  horizon_weeks: number;
  study_preferences: StudyPreferences;
  total_sessions: number;
  total_hours: number;
  completed_sessions: number;
  total_study_sessions: number;
  progress_percentage: number;
  generation_mode: 'gemini_ai' | 'deterministic_engine' | string;
  generation_mode_label: string;
  plan_summary: StudyPlanSummary;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  next_session?: StudySession | null;
  sessions: StudySession[];
}

export interface StudyPlanGeneratePayload {
  goal: string;
  topics: string[];
  daily_hours: number;
  horizon_weeks: number;
  study_preferences?: StudyPreferences;
  context_source?: 'skill_gap' | 'interview' | 'resume' | 'custom';
  skill_gap_id?: number | null;
  interview_session_id?: number | null;
  resume_id?: number | null;
}

export interface StudyPlanHistoryRecord {
  id: number;
  parent_plan_id?: number | null;
  version: number;
  title: string;
  goal: string;
  topics: string[];
  context_source: string;
  daily_hours: number;
  horizon_weeks: number;
  total_hours: number;
  target_date?: string;
  total_study_sessions: number;
  completed_study_sessions: number;
  progress_percentage: number;
  generation_mode: string;
  generation_mode_label?: string;
  is_active: boolean;
  created_at: string;
}

export interface StudyPlannerContext {
  skill_gap?: {
    id: number;
    target_role: string;
    missing_skills: string[];
    adjacent_skills: Array<{ target_skill: string; candidate_skill: string }>;
    core_coverage: number;
    created_at: string;
  } | null;
  interview?: {
    id: number;
    target_role: string;
    difficulty: string;
    question_focus: string;
    selected_skills: string[];
    created_at: string;
  } | null;
  resume?: {
    id: number;
    filename: string;
    score: number;
    extracted_skills: string[];
    created_at: string;
  } | null;
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  default_target_role?: string;
  weekly_study_goal_hours?: number;
  difficulty_tier?: string;
  rest_days_mode?: string;
  email_notifications?: boolean;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  college?: string;
  target_role?: string;
  degree_program?: string;
  graduation_year?: number;
  preferences?: UserPreferences;
  created_at?: string;
}


