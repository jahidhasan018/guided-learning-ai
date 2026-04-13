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

export interface AppState {
  sessions: LearningSession[];
  currentSessionId: string | null;
}
