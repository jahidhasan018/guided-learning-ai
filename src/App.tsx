import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopicSetup } from '@/components/TopicSetup';
import { ChatInterface } from '@/components/ChatInterface';
import { LearningSession, LearningLevel, LearningMode, Message } from '@/types';
import { storage } from '@/lib/storage';
import { gemini } from '@/lib/gemini';
import { TooltipProvider } from '@/components/ui/tooltip';
import { parseRoadmap } from '@/lib/utils';

export default function App() {
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const savedSessions = storage.getSessions();
    setSessions(savedSessions);
    if (savedSessions.length > 0) {
      setCurrentSessionId(savedSessions[0].id);
    }
  }, []);

  const handleStartSession = async (topic: string, level: LearningLevel, mode: LearningMode, language: string) => {
    setIsInitializing(true);
    const newSession: LearningSession = {
      id: Date.now().toString(),
      topic,
      level,
      mode,
      language,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      // Initial greeting and roadmap
      const initialResponse = await gemini.sendMessage(newSession, `Hello! I want to learn about ${topic}. Please provide a roadmap and start the first lesson.`, []);
      
      const welcomeMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: initialResponse,
        timestamp: Date.now(),
      };

      newSession.messages = [welcomeMsg];
      
      const roadmapItems = parseRoadmap(initialResponse);
      if (roadmapItems) {
        roadmapItems[0].messageId = welcomeMsg.id;
        newSession.roadmapItems = roadmapItems;
      }

      storage.addSession(newSession);
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
    } catch (error) {
      console.error('Failed to initialize session:', error);
      // Still add the session even if AI fails initially, user can retry
      storage.addSession(newSession);
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleUpdateSession = (updatedSession: LearningSession) => {
    storage.updateSession(updatedSession);
    setSessions(sessions.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const handleDeleteSession = (id: string) => {
    storage.deleteSession(id);
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    if (currentSessionId === id) {
      setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-white text-zinc-900 font-sans overflow-hidden">
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewSession={() => setCurrentSessionId(null)}
          onDeleteSession={handleDeleteSession}
        />
        
        <main className="flex-1 flex flex-col h-full relative overflow-hidden">
          {currentSessionId && currentSession ? (
            <ChatInterface 
              session={currentSession} 
              onUpdateSession={handleUpdateSession} 
            />
          ) : (
            <TopicSetup onStart={handleStartSession} />
          )}

          {isInitializing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-zinc-900">Preparing your learning journey...</p>
                <p className="text-sm text-zinc-500">Generating roadmap and first lesson</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
