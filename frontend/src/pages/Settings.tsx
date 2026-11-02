import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  User,
  Sun,
  Moon,
  Sliders,
  Shield,
  Database,
  Server,
  Save,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RotateCw,
  LogOut,
  Lock,
  Key,
  GraduationCap,
  Briefcase,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBackendStatus } from '../hooks/useBackendStatus';

export const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateProfile, changePassword, updatePreferences, deleteData, logout } = useAuth();
  const { state: apiState, health, error: apiError, latencyMs, checkNow } = useBackendStatus();

  // Tab State: default to param if present
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'appearance', 'preferences', 'security', 'privacy', 'diagnostics'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const setTab = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    college: user?.college || '',
    degree_program: user?.degree_program || '',
    target_role: user?.target_role || 'Full Stack Developer',
    graduation_year: user?.graduation_year || new Date().getFullYear() + 1,
  });
  const [profileStatus, setProfileStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        college: user.college || '',
        degree_program: user.degree_program || '',
        target_role: user.target_role || 'Full Stack Developer',
        graduation_year: user.graduation_year || new Date().getFullYear() + 1,
      });
    }
  }, [user]);

  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  // Preferences Form State
  const [preferencesForm, setPreferencesForm] = useState({
    default_target_role: user?.preferences?.default_target_role || user?.target_role || 'Full Stack Developer',
    weekly_study_goal_hours: user?.preferences?.weekly_study_goal_hours || 10,
    difficulty_tier: user?.preferences?.difficulty_tier || 'Intermediate',
    rest_days_mode: user?.preferences?.rest_days_mode || 'Weekends Off (2 days)',
  });
  const [prefStatus, setPrefStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Security / Password Form State
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [securityStatus, setSecurityStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Data / Privacy Modals
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [dataActionStatus, setDataActionStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handlers
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    setIsSavingProfile(true);
    try {
      const res = await updateProfile({
        name: profileForm.name.trim(),
        college: profileForm.college.trim(),
        degree_program: profileForm.degree_program.trim(),
        target_role: profileForm.target_role.trim(),
        graduation_year: Number(profileForm.graduation_year),
      });
      if (res.success) {
        setProfileStatus({ success: 'Profile successfully updated.' });
        setTimeout(() => setProfileStatus(null), 4000);
      } else {
        setProfileStatus({ error: res.error || 'Failed to update profile.' });
      }
    } catch (err: any) {
      setProfileStatus({ error: err.message || 'Error saving profile.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefStatus(null);
    setIsSavingPrefs(true);
    try {
      const res = await updatePreferences({
        default_target_role: preferencesForm.default_target_role,
        weekly_study_goal_hours: Number(preferencesForm.weekly_study_goal_hours),
        difficulty_tier: preferencesForm.difficulty_tier,
        rest_days_mode: preferencesForm.rest_days_mode,
      });
      if (res.success) {
        setPrefStatus({ success: 'Preferences saved.' });
        setTimeout(() => setPrefStatus(null), 4000);
      } else {
        setPrefStatus({ error: res.error || 'Failed to save preferences.' });
      }
    } catch (err: any) {
      setPrefStatus({ error: err.message || 'Error saving preferences.' });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityStatus(null);

    if (passwordForm.new_password.length < 6) {
      setSecurityStatus({ error: 'New password must be at least 6 characters.' });
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_new_password) {
      setSecurityStatus({ error: 'New passwords do not match.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      if (res.success) {
        setSecurityStatus({ success: 'Password changed successfully.' });
        setPasswordForm({ current_password: '', new_password: '', confirm_new_password: '' });
        setTimeout(() => setSecurityStatus(null), 4000);
      } else {
        setSecurityStatus({ error: res.error || 'Failed to update password.' });
      }
    } catch (err: any) {
      setSecurityStatus({ error: err.message || 'Error updating password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleClearActivity = async () => {
    setIsDeleting(true);
    setDataActionStatus(null);
    try {
      const res = await deleteData('DELETE_ALL_DATA');
      if (res.success) {
        setShowClearModal(false);
        setDataActionStatus({ success: 'All activity records (resumes, evaluations, interviews, plans) cleared successfully.' });
        setTimeout(() => setDataActionStatus(null), 5000);
      } else {
        setDataActionStatus({ error: res.error || 'Failed to clear activity data.' });
      }
    } catch (err: any) {
      setDataActionStatus({ error: err.message || 'Error during activity deletion.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      setDataActionStatus({ error: "Please type 'DELETE' to confirm account deletion." });
      return;
    }
    setIsDeleting(true);
    setDataActionStatus(null);
    try {
      const res = await deleteData('DELETE_ACCOUNT');
      if (res.success) {
        setShowDeleteModal(false);
        navigate('/login', { replace: true });
      } else {
        setDataActionStatus({ error: res.error || 'Failed to delete account.' });
      }
    } catch (err: any) {
      setDataActionStatus({ error: err.message || 'Error deleting account.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* Settings Navigation Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto scrollbar-none">
        <nav className="flex space-x-1 sm:space-x-4 min-w-max pb-px" aria-label="Tabs">
          <button
            onClick={() => setTab('profile')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setTab('appearance')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'appearance'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Appearance</span>
          </button>

          <button
            onClick={() => setTab('preferences')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'preferences'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Preferences</span>
          </button>

          <button
            onClick={() => setTab('security')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Account &amp; Security</span>
          </button>

          <button
            onClick={() => setTab('privacy')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'privacy'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Data &amp; Privacy</span>
          </button>

          <button
            onClick={() => setTab('diagnostics')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'diagnostics'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Diagnostics</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Profile</h2>
              <p className="text-xs text-slate-500">
                Personalized academic identity stored securely in your account
              </p>
            </div>
            {profileStatus?.success && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {profileStatus.success}
              </span>
            )}
            {profileStatus?.error && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 px-3 py-1 rounded-md border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                {profileStatus.error}
              </span>
            )}
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="block w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Account email cannot be modified directly.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">College / University</label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={profileForm.college}
                    onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                    placeholder="e.g. UC Berkeley"
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Degree Program</label>
                <input
                  type="text"
                  value={profileForm.degree_program}
                  onChange={(e) => setProfileForm({ ...profileForm, degree_program: e.target.value })}
                  placeholder="e.g. B.S. Computer Science"
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Career Role</label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <select
                    value={profileForm.target_role}
                    onChange={(e) => setProfileForm({ ...profileForm, target_role: e.target.value })}
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                    <option value="DevOps / Cloud Engineer">DevOps / Cloud Engineer</option>
                    <option value="Data Scientist">Data Scientist</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Graduation Year</label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    min={2020}
                    max={2035}
                    value={profileForm.graduation_year}
                    onChange={(e) => setProfileForm({ ...profileForm, graduation_year: Number(e.target.value) })}
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: APPEARANCE */}
      {activeTab === 'appearance' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Appearance &amp; Theme</h2>
            <p className="text-xs text-slate-500">
              Customize how CareerCopilot displays on your device
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Light Theme Option */}
            <div
              onClick={() => handleThemeChange('light')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Light Theme</h3>
                  {theme === 'light' && (
                    <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Clean, high-contrast academic daylight interface for well-lit study environments.
                </p>
              </div>
            </div>

            {/* Dark Theme Option */}
            <div
              onClick={() => handleThemeChange('dark')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                theme === 'dark'
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="p-2.5 bg-slate-900 text-indigo-400 rounded-lg shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Dark Theme</h3>
                  {theme === 'dark' && (
                    <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Reduced eye fatigue palette engineered for late-night problem solving and study sessions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Study &amp; Career Preferences</h2>
              <p className="text-xs text-slate-500">
                Curated default parameters used across Study Planner and Interview Generator
              </p>
            </div>
            {prefStatus?.success && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {prefStatus.success}
              </span>
            )}
            {prefStatus?.error && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 px-3 py-1 rounded-md border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                {prefStatus.error}
              </span>
            )}
          </div>

          <form onSubmit={handlePreferencesSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Target Role
                </label>
                <select
                  value={preferencesForm.default_target_role}
                  onChange={(e) => setPreferencesForm({ ...preferencesForm, default_target_role: e.target.value })}
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="Full Stack Developer">Full Stack Developer</option>
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                  <option value="DevOps / Cloud Engineer">DevOps / Cloud Engineer</option>
                  <option value="Data Scientist">Data Scientist</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">Pre-selects benchmarks in skill analysis.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Weekly Study Commitment
                </label>
                <select
                  value={preferencesForm.weekly_study_goal_hours}
                  onChange={(e) => setPreferencesForm({ ...preferencesForm, weekly_study_goal_hours: Number(e.target.value) })}
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value={5}>5 hours / week (Light / Casual)</option>
                  <option value={10}>10 hours / week (Balanced Student)</option>
                  <option value={15}>15 hours / week (Intensive Prep)</option>
                  <option value={20}>20+ hours / week (Bootcamp / Accelerated)</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">Calibrates daily session duration suggestions.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Difficulty Tier
                </label>
                <select
                  value={preferencesForm.difficulty_tier}
                  onChange={(e) => setPreferencesForm({ ...preferencesForm, difficulty_tier: e.target.value })}
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="Beginner">Beginner (Foundations &amp; Core Concepts)</option>
                  <option value="Intermediate">Intermediate (Real-world Architecture)</option>
                  <option value="Advanced">Advanced (Edge cases &amp; Senior Engineering)</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">Default level for interview question generation.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rest Days Cadence
                </label>
                <select
                  value={preferencesForm.rest_days_mode}
                  onChange={(e) => setPreferencesForm({ ...preferencesForm, rest_days_mode: e.target.value })}
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="Weekends Off (2 days)">Weekends Off (5 study days / 2 rest days)</option>
                  <option value="1 Day Midweek Rest">1 Rest Day per week (6 study days)</option>
                  <option value="Intensive 7-Day Sprint">Intensive 7-Day (No rest days)</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">Controls rest day placement in generated study schedules.</span>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={isSavingPrefs}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingPrefs ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: ACCOUNT & SECURITY */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8 animate-in fade-in duration-150">
          <div>
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Account &amp; Security</h2>
              <p className="text-xs text-slate-500">
                Manage your authentication credentials and session security
              </p>
            </div>

            {securityStatus?.success && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{securityStatus.success}</span>
              </div>
            )}
            {securityStatus?.error && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{securityStatus.error}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    placeholder="Enter current password"
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirm_new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_new_password: e.target.value })}
                    placeholder="Repeat new password"
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Active Session & Logout */}
          <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Signed in as {user?.email}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Session secured via HTTP-only cryptographic cookies.
              </p>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate('/', { replace: true });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: DATA & PRIVACY */}
      {activeTab === 'privacy' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Data Ownership &amp; Privacy</h2>
            <p className="text-xs text-slate-500">
              Manage your personal student records, evaluations, and account deletion
            </p>
          </div>

          {dataActionStatus?.success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{dataActionStatus.success}</span>
            </div>
          )}
          {dataActionStatus?.error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{dataActionStatus.error}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-600">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              How CareerCopilot Isolates Your Data
            </h3>
            <p>
              Every uploaded resume, calculated skill gap evaluation, generated interview practice session, and customized study plan is strictly associated with your unique account identifier.
            </p>
            <p>
              Other users cannot view or mutate your analysis history. Legacy anonymous records remain completely segregated.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Clear My Activity History</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Permanently deletes all your resumes, skill evaluations, interview sessions, and study plans. Your account and login credentials will remain intact.
                </p>
              </div>
              <button
                onClick={() => setShowClearModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors shrink-0"
              >
                Clear History
              </button>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-rose-900">Delete Account &amp; All Data</h4>
                <p className="text-[11px] text-rose-600 mt-0.5">
                  Irreversibly deletes your user account, authentication profile, and all associated career records from SQLite.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shrink-0 shadow-xs"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DIAGNOSTICS & SYSTEM (Secondary view) */}
      {activeTab === 'diagnostics' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">System Diagnostics</h2>
              <p className="text-xs text-slate-500">
                Real-time operational status of backend services and SQLite connection
              </p>
            </div>
            <button
              onClick={() => checkNow()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Ping Now</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Connection</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${apiState === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-sm font-bold text-slate-800 capitalize">{apiState}</span>
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Latency: {latencyMs}ms</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Database</span>
              <div className="flex items-center gap-2 mt-1">
                <Database className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-bold text-slate-800">{health?.database?.status || 'Unknown'}</span>
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Tables: {health?.database?.details?.tables_count ?? 'N/A'}</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Environment</span>
              <div className="flex items-center gap-2 mt-1">
                <Server className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-bold text-slate-800">{health?.stage || 'Local Development'}</span>
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Version: {health?.version || '0.7.0'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear Activity */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Clear Activity History?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This will permanently delete all your uploaded resumes, skill gap evaluations, interview sessions, and study schedules. Your account will remain active.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleClearActivity}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Clearing...' : 'Yes, Clear All History'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Account */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Entire Account?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This action is irreversible. It permanently deletes your login credentials, profile, and all associated student data from the system.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-semibold text-slate-700">
                Type <span className="font-mono text-rose-600 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmationText !== 'DELETE'}
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
