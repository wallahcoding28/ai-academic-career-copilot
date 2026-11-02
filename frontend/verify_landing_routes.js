/**
 * Phase 8 Route & Landing Page Structural Verification Script
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runChecks() {
  console.log('=== VERIFYING PHASE 8 LANDING PAGE & ROUTING ===\n');
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

  // 1. LandingPage Component File
  const landingPath = path.join(__dirname, 'src', 'pages', 'LandingPage.tsx');
  assert(fs.existsSync(landingPath), 'LandingPage.tsx exists');
  const landingContent = fs.readFileSync(landingPath, 'utf8');

  // 2. Section Anchors
  assert(landingContent.includes('id="features"'), 'Features section anchor (#features) is present');
  assert(landingContent.includes('id="how-it-works"'), 'How It Works section anchor (#how-it-works) is present');
  assert(landingContent.includes('id="progress"'), 'Progress & Value section anchor (#progress) is present');
  assert(landingContent.includes('id="modules"'), 'Platform Modules anchor (#modules) is present');

  // 3. Navigation CTAs to /login and /signup
  assert(landingContent.includes('to="/login"'), 'Navigation link to /login is present');
  assert(landingContent.includes('to="/signup"'), 'Navigation link to /signup is present');
  assert(landingContent.includes('Get Started'), 'Hero CTA "Get Started" is present');
  assert(landingContent.includes('Explore Features'), 'Secondary CTA "Explore Features" is present');

  // 4. Grounded in actual implemented features (no fake modules)
  assert(landingContent.includes('AI Resume Analyzer'), 'Feature: AI Resume Analyzer documented');
  assert(landingContent.includes('Skill Gap Analyzer'), 'Feature: Skill Gap Analyzer documented');
  assert(landingContent.includes('Interview Question Generator'), 'Feature: Interview Generator documented');
  assert(landingContent.includes('AI Study Planner'), 'Feature: AI Study Planner documented');
  assert(landingContent.includes('Snapshot Comparison'), 'Feature: Resume Snapshot Comparison documented');

  // 5. App.tsx Dynamic Routing Architecture
  const appPath = path.join(__dirname, 'src', 'App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(appContent.includes('RootRouteHandler'), 'RootRouteHandler handles / route dynamically');
  assert(appContent.includes('<LandingPage />'), 'RootRouteHandler renders LandingPage when logged out');
  assert(appContent.includes('<Dashboard />'), 'RootRouteHandler renders Dashboard when authenticated');
  assert(appContent.includes('<ProtectedRoute>'), 'ProtectedRoute guards dashboard routes');
  assert(appContent.includes('path="/login"'), 'Dedicated /login route exists');
  assert(appContent.includes('path="/signup"'), 'Dedicated /signup route exists');

  // 6. No Fabricated Data / Testimonials Check
  const bannedPhrases = ['50,000+ students', '5-star rating', '99.9% hire rate', 'John Doe says', 'Jane Smith placed at Google'];
  let foundBanned = false;
  for (const phrase of bannedPhrases) {
    if (landingContent.toLowerCase().includes(phrase.toLowerCase())) {
      foundBanned = true;
      break;
    }
  }
  assert(!foundBanned, 'Zero fabricated testimonials or fake statistics present in LandingPage');

  console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runChecks();

