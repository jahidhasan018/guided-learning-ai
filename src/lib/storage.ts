import { LearningSession, UserProfile } from '../types';

const STORAGE_KEY = 'guided_learning_sessions';
const PROFILE_KEY = 'guided_learning_profile';

const defaultProfile: UserProfile = {
  name: 'Student',
  email: 'student@example.com',
  preferences: {
    theme: 'light',
    defaultProvider: 'gemini',
    apiKeys: {}
  }
};

export const storage = {
  getSessions: (): LearningSession[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse sessions from localStorage', e);
      return [];
    }
  },

  saveSessions: (sessions: LearningSession[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  },

  addSession: (session: LearningSession) => {
    const sessions = storage.getSessions();
    sessions.unshift(session);
    storage.saveSessions(sessions);
  },

  updateSession: (updatedSession: LearningSession) => {
    const sessions = storage.getSessions();
    const index = sessions.findIndex(s => s.id === updatedSession.id);
    if (index !== -1) {
      sessions[index] = { ...updatedSession, updatedAt: Date.now() };
      storage.saveSessions(sessions);
    }
  },

  deleteSession: (id: string) => {
    const sessions = storage.getSessions();
    const filtered = sessions.filter(s => s.id !== id);
    storage.saveSessions(filtered);
  },

  getProfile: (): UserProfile => {
    const data = localStorage.getItem(PROFILE_KEY);
    if (!data) return defaultProfile;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultProfile;
    }
  },

  updateProfile: (profile: UserProfile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
};
