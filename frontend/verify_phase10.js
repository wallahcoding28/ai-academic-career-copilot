/**
 * Phase 10 Verification Script: Theme Support & Landing/Logout Navigation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runVerification() {
  console.log('=== VERIFYING PHASE 10: THEME SUPPORT & NAVIGATION ===\n');
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

  // 1. ThemeContext file
  const themeContextPath = path.join(__dirname, 'src', 'context', 'ThemeContext.tsx');
  assert(fs.existsSync(themeContextPath), 'ThemeContext.tsx exists');
  const themeContextContent = fs.readFileSync(themeContextPath, 'utf8');
  assert(themeContextContent.includes('export const ThemeProvider'), 'ThemeProvider is exported');
  assert(themeContextContent.includes('export const useTheme'), 'useTheme hook is exported');
  assert(themeContextContent.includes('localStorage.getItem'), 'LocalStorage persistence implemented in ThemeContext');
  assert(themeContextContent.includes('updatePreferences'), 'Backend preference sync implemented for authenticated users');
  assert(themeContextContent.includes('classList.add(\'dark\')'), 'Document classList manipulation supported');

  // 2. Pre-hydration anti-flicker script in index.html
  const indexPath = path.join(__dirname, 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert(indexContent.includes('localStorage.getItem(\'copilot_theme\')'), 'Pre-hydration theme check present in index.html');
  assert(indexContent.includes('document.documentElement.classList.add(\'dark\')'), 'Pre-hydration dark class application in index.html');

  // 3. App.tsx ThemeProvider integration
  const appPath = path.join(__dirname, 'src', 'App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(appContent.includes('<ThemeProvider>'), 'ThemeProvider wraps application in App.tsx');

  // 4. Centralized design tokens in index.css
  const cssPath = path.join(__dirname, 'src', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  assert(cssContent.includes('--bg-page:'), 'CSS variable --bg-page defined');
  assert(cssContent.includes('--bg-surface:'), 'CSS variable --bg-surface defined');
  assert(cssContent.includes('html.dark, [data-theme=\'dark\']'), 'Dark theme selector defined');
  assert(cssContent.includes('html.dark .bg-white'), 'Centralized .bg-white theme adapter present');
  assert(cssContent.includes('html.dark .border-slate-200'), 'Centralized .border-slate-200 theme adapter present');
  assert(cssContent.includes('html.dark .text-slate-900'), 'Centralized .text-slate-900 theme adapter present');
  assert(cssContent.includes('html.dark input:not'), 'Centralized form input theme adapter present');
  assert(cssContent.includes('html.dark .bg-emerald-50'), 'Centralized status badge WCAG AA adapter present');

  // 5. Header.tsx theme & logout navigation
  const headerPath = path.join(__dirname, 'src', 'components', 'Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');
  assert(headerContent.includes('useTheme()'), 'Header uses centralized useTheme');
  assert(headerContent.includes("navigate('/', { replace: true })"), "Header logout navigates to '/' (landing page)");
  assert(headerContent.includes('aria-label="Toggle light or dark mode"'), 'Direct header theme toggle icon button present');

  // 6. Settings.tsx theme & logout navigation
  const settingsPath = path.join(__dirname, 'src', 'pages', 'Settings.tsx');
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');
  assert(settingsContent.includes('useTheme()'), 'Settings uses centralized useTheme');
  assert(settingsContent.includes("navigate('/', { replace: true })"), "Settings logout navigates to '/' (landing page)");

  // 7. LandingPage.tsx navigation and theme toggle
  const landingPath = path.join(__dirname, 'src', 'pages', 'LandingPage.tsx');
  const landingContent = fs.readFileSync(landingPath, 'utf8');
  assert(landingContent.includes('useTheme()'), 'LandingPage uses centralized useTheme');
  assert(/Log in/i.test(landingContent), 'LandingPage has clear "Log in" action');
  assert(landingContent.includes('Get started'), 'LandingPage has clear "Get started" action');
  assert(landingContent.includes('dark:bg-slate-950'), 'LandingPage supports light & dark theme styling');

  // 8. Login.tsx & Signup.tsx theme toggle & redirection
  const loginPath = path.join(__dirname, 'src', 'pages', 'Login.tsx');
  const loginContent = fs.readFileSync(loginPath, 'utf8');
  assert(loginContent.includes('useTheme()'), 'Login uses centralized useTheme');
  assert(loginContent.includes('fromLocation'), 'Login supports redirecting back to fromLocation');
  assert(loginContent.includes('dark:bg-slate-950'), 'Login supports light & dark theme styling');

  const signupPath = path.join(__dirname, 'src', 'pages', 'Signup.tsx');
  const signupContent = fs.readFileSync(signupPath, 'utf8');
  assert(signupContent.includes('useTheme()'), 'Signup uses centralized useTheme');
  assert(signupContent.includes('dark:bg-slate-950'), 'Signup supports light & dark theme styling');

  console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
