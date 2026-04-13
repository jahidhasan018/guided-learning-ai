export type LearningLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type LearningMode = 'Theory' | 'Project';

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  attachments?: {
    name: string;
    type: string;
    url: string;
  }[];
}

export interface RoadmapItem {
  id: string;
  title: string;
  isCompleted: boolean;
  isActive: boolean;
  messageId?: string;
}

export interface LearningSession {
  id: string;
  topic: string;
  level: LearningLevel;
  mode: LearningMode;
  language: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  roadmap?: string;
  roadmapItems?: RoadmapItem[];
}

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'groq' | 'mistral';

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    defaultProvider: AIProvider;
    apiKeys: {
      openai?: string;
      claude?: string;
      groq?: string;
      mistral?: string;
    };
  };
}

export interface AppState {
  sessions: LearningSession[];
  currentSessionId: string | null;
  profile: UserProfile;
}
