import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopicSetup } from '@/components/TopicSetup';
import { ChatInterface } from '@/components/ChatInterface';
import { LearningSession, LearningLevel, LearningMode, Message, UserProfile } from '@/types';
import { storage } from '@/lib/storage';
import { gemini } from '@/lib/gemini';
import { TooltipProvider } from '@/components/ui/tooltip';
import { parseRoadmap, cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>(storage.getProfile());
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const savedSessions = storage.getSessions();
    setSessions(savedSessions);
    if (savedSessions.length > 0) {
      setCurrentSessionId(savedSessions[0].id);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const theme = profile.preferences.theme;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
  }, [profile.preferences.theme]);

  const handleUpdateProfile = (newProfile: UserProfile) => {
    storage.updateProfile(newProfile);
    setProfile(newProfile);
  };

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
      const initialResponse = await gemini.sendMessage(newSession, `Hello! I want to learn about ${topic}. Please provide a roadmap and start the first lesson.`, [], profile);
      
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

  const sidebarProps = {
    sessions,
    currentSessionId,
    profile,
    onSelectSession: (id: string) => {
      setCurrentSessionId(id);
      setIsMobileMenuOpen(false);
    },
    onNewSession: () => {
      setCurrentSessionId(null);
      setIsMobileMenuOpen(false);
    },
    onDeleteSession: handleDeleteSession,
    onUpdateProfile: handleUpdateProfile,
  };

  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] bg-background text-foreground font-sans overflow-hidden">
        {/* Desktop Sidebar */}
        <div
          className={cn(
            "hidden md:block h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden",
            isSidebarCollapsed ? "w-0" : "w-72"
          )}
        >
          <div className={cn(
            "w-72 h-full transition-transform duration-300 ease-in-out",
            isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
          )}>
            <Sidebar {...sidebarProps} />
          </div>
        </div>
        
        <main className="flex-1 flex flex-col h-full relative overflow-hidden">
          {/* Desktop Sidebar Toggle Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              "hidden md:flex absolute top-4 z-30 rounded-full w-8 h-8 shadow-sm transition-all duration-300 ease-in-out bg-background text-muted-foreground hover:text-foreground",
              isSidebarCollapsed ? "left-4" : "-left-4"
            )}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>

          {/* Mobile Header */}
          <div className="md:hidden flex items-center p-4 border-b bg-background shrink-0">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="mr-2" />}>
                <Menu className="w-5 h-5" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <Sidebar {...sidebarProps} />
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold text-foreground">Guided Learning</h1>
          </div>

          {currentSessionId && currentSession ? (
            <ChatInterface 
              session={currentSession} 
              profile={profile}
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
