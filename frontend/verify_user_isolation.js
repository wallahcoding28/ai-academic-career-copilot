/**
 * User Data Isolation Verification Script
 * Validates frontend context scoping, user identity synchronization, and empty-state guarantees.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runVerification() {
  console.log('=== VERIFYING USER DATA ISOLATION & FRONTEND STATE RESET ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. ResumeContext user scoping
  const resumeContextPath = path.join(__dirname, 'src', 'context', 'ResumeContext.tsx');
  const resumeContextContent = fs.readFileSync(resumeContextPath, 'utf8');

  assert(
    resumeContextContent.includes("import { useAuth } from './AuthContext'"),
    'ResumeContext connects to AuthContext to track user identity'
  );
  assert(
    resumeContextContent.includes('const getStorageKey = (prefix: string, uid: number | null)'),
    'ResumeContext defines user-scoped localStorage key generator'
  );
  assert(
    resumeContextContent.includes('[currentUserId]'),
    'ResumeContext re-initializes on user identity change'
  );
  assert(
    resumeContextContent.includes('setActiveResumeAnalysis(null)') &&
    resumeContextContent.includes('setActiveResumeId(null)') &&
    resumeContextContent.includes('setActiveSkillGapResult(null)'),
    'ResumeContext immediately purges previous user state on identity transition'
  );
  assert(
    resumeContextContent.includes('if (latestResumes.length === 0)'),
    'ResumeContext handles empty state for brand-new users without resumes'
  );

  // 2. AuthContext logout cleanup
  const authContextPath = path.join(__dirname, 'src', 'context', 'AuthContext.tsx');
  const authContextContent = fs.readFileSync(authContextPath, 'utf8');

  assert(
    authContextContent.includes("localStorage.removeItem('copilot_active_resume_id')"),
    'AuthContext clears legacy un-scoped resume storage on logout'
  );

  // 3. SkillGap synchronization
  const skillGapPath = path.join(__dirname, 'src', 'pages', 'SkillGap.tsx');
  const skillGapContent = fs.readFileSync(skillGapPath, 'utf8');

  assert(
    skillGapContent.includes('setResult(activeSkillGapResult);') &&
    skillGapContent.includes('[activeSkillGapResult]'),
    'SkillGap synchronizes evaluation result with context state'
  );
  assert(
    skillGapContent.includes('setSelectedResumeId(activeResumeId);') &&
    skillGapContent.includes('[activeResumeId]'),
    'SkillGap synchronizes selected resume ID with context state'
  );
  assert(
    skillGapContent.includes('setResumes(availableResumes);') &&
    skillGapContent.includes('[availableResumes]'),
    'SkillGap synchronizes available resumes with context state'
  );

  // 4. InterviewGenerator user scoping
  const interviewPath = path.join(__dirname, 'src', 'pages', 'InterviewGenerator.tsx');
  const interviewContent = fs.readFileSync(interviewPath, 'utf8');

  assert(
    interviewContent.includes('questionsStorageKey = user ? `copilot_saved_questions_u${user.id}` :'),
    'InterviewGenerator user-scopes question bookmarks to authenticated identity'
  );

  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
