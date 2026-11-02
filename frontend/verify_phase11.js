/**
 * Phase 11 Verification Script: Methodology Note Contrast & Landing Page Accuracy
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runVerification() {
  console.log('=== VERIFYING PHASE 11: CONTRAST FIX & WORDING ACCURACY ===\n');
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

  // 1. LandingPage hero subtitle wording
  const landingPath = path.join(__dirname, 'src', 'pages', 'LandingPage.tsx');
  const landingContent = fs.readFileSync(landingPath, 'utf8');
  assert(
    landingContent.includes('evaluates your technical resume against structured career-readiness reference profiles'),
    'Landing page hero accurately states: evaluates your technical resume against structured career-readiness reference profiles'
  );
  assert(
    !landingContent.includes('real industry benchmarks'),
    'Landing page removed "real industry benchmarks" exaggeration'
  );

  // 2. SkillGap methodology note contrast
  const skillGapPath = path.join(__dirname, 'src', 'pages', 'SkillGap.tsx');
  const skillGapContent = fs.readFileSync(skillGapPath, 'utf8');
  assert(
    skillGapContent.includes('Methodology &amp; Benchmark Transparency:') || skillGapContent.includes('Methodology & Benchmark Transparency:'),
    'SkillGap has Methodology & Benchmark Transparency notice'
  );
  assert(
    skillGapContent.includes('dark:bg-slate-900/90') && skillGapContent.includes('dark:text-slate-300'),
    'SkillGap methodology notice uses dark surface and light body text in dark mode'
  );
  assert(
    skillGapContent.includes('dark:text-white') && skillGapContent.includes('font-bold'),
    'SkillGap methodology notice heading is bold and visually distinct with dark:text-white'
  );
  assert(
    skillGapContent.includes('dark:text-indigo-400') || skillGapContent.includes('dark:text-slate-400'),
    'SkillGap methodology icon adapts in dark mode'
  );

  // 3. ResumeAnalyzer methodology note contrast
  const resumePath = path.join(__dirname, 'src', 'pages', 'ResumeAnalyzer.tsx');
  const resumeContent = fs.readFileSync(resumePath, 'utf8');
  assert(
    resumeContent.includes('Methodology &amp; Benchmark Transparency:'),
    'ResumeAnalyzer includes Methodology & Benchmark Transparency notice'
  );
  assert(
    resumeContent.includes('dark:bg-slate-900/90') && resumeContent.includes('dark:text-slate-300'),
    'ResumeAnalyzer methodology notice uses dark surface and light body text in dark mode'
  );
  assert(
    resumeContent.includes('dark:bg-blue-950/40'),
    'ResumeAnalyzer Executive Assessment callout adapts to dark mode'
  );

  // 4. InterviewGenerator & StudyPlanner methodology notices
  const interviewPath = path.join(__dirname, 'src', 'pages', 'InterviewGenerator.tsx');
  const interviewContent = fs.readFileSync(interviewPath, 'utf8');
  assert(
    interviewContent.includes('dark:bg-slate-900/90') && interviewContent.includes('dark:text-slate-300'),
    'InterviewGenerator methodology notice uses dark surface and light body text in dark mode'
  );

  const studyPath = path.join(__dirname, 'src', 'pages', 'StudyPlanner.tsx');
  const studyContent = fs.readFileSync(studyPath, 'utf8');
  assert(
    studyContent.includes('dark:bg-slate-900/90') && studyContent.includes('dark:text-slate-300'),
    'StudyPlanner methodology notice uses dark surface and light body text in dark mode'
  );

  console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();

