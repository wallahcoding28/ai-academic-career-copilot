import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, UserPreferences } from '../types';
import {
  fetchCurrentUser,
  loginUser,
  signupUser,
  logoutUser,
  updateUserProfile,
  changeUserPassword,
  updateUserPreferences,
  deleteUserData,
} from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (payload: {
    name: string;
    email: string;
    password: string;
    college?: string;
    target_role?: string;
    degree_program?: string;
    graduation_year?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (payload: {
    name?: string;
    college?: string;
    target_role?: string;
    degree_program?: string;
    graduation_year?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (payload: {
    current_password: string;
    new_password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updatePreferences: (preferences: UserPreferences) => Promise<{ success: boolean; error?: string }>;
  deleteData: (confirmation: 'DELETE_ALL_DATA' | 'DELETE_ACCOUNT') => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const res = await fetchCurrentUser();
      if (res.ok && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const res = await loginUser({ email, password });
    if (res.ok && res.data) {
      setUser(res.data);
      return { success: true };
    }
    const err = res.error || 'Login failed. Please check your credentials.';
    setError(err);
    return { success: false, error: err };
  };

  const signup = async (payload: {
    name: string;
    email: string;
    password: string;
    college?: string;
    target_role?: string;
    degree_program?: string;
    graduation_year?: number;
  }) => {
    setError(null);
    const res = await signupUser(payload);
    if (res.ok && res.data) {
      setUser(res.data);
      return { success: true };
    }
    const err = res.error || 'Signup failed. Please try again.';
    setError(err);
    return { success: false, error: err };
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  };

  const updateProfile = async (payload: {
    name?: string;
    college?: string;
    target_role?: string;
    degree_program?: string;
    graduation_year?: number;
  }) => {
    const res = await updateUserProfile(payload);
    if (res.ok && res.data) {
      setUser(res.data);
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to update profile.' };
  };

  const changePassword = async (payload: {
    current_password: string;
    new_password: string;
  }) => {
    const res = await changeUserPassword(payload);
    if (res.ok) {
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to change password.' };
  };

  const updatePreferences = async (preferences: UserPreferences) => {
    const res = await updateUserPreferences(preferences);
    if (res.ok && res.data) {
      if (user) {
        setUser({ ...user, preferences: res.data });
      }
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to update preferences.' };
  };

  const deleteData = async (confirmation: 'DELETE_ALL_DATA' | 'DELETE_ACCOUNT') => {
    const res = await deleteUserData(confirmation);
    if (res.ok) {
      if (confirmation === 'DELETE_ACCOUNT') {
        setUser(null);
      }
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to perform deletion.' };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        signup,
        logout,
        updateProfile,
        changePassword,
        updatePreferences,
        deleteData,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

