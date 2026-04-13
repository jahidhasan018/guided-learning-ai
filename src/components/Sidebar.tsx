import React from 'react';
import { LearningSession, UserProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, MessageSquare, Trash2, GraduationCap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ProfileSettings } from './ProfileSettings';

interface SidebarProps {
  sessions: LearningSession[];
  currentSessionId: string | null;
  profile: UserProfile;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onUpdateProfile: (profile: UserProfile) => void;
}

export function Sidebar({ 
  sessions, 
  currentSessionId, 
  profile,
  onSelectSession, 
  onNewSession, 
  onDeleteSession,
  onUpdateProfile
}: SidebarProps) {
  const initials = profile.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-72 border-r bg-sidebar flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-semibold text-foreground tracking-tight leading-none">Guided Learning</h1>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">AI:</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary px-1.5 py-0.5 bg-primary/10 rounded-full">
                {profile.preferences.defaultProvider}
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={onNewSession}
          variant="outline"
          className="w-full justify-start gap-2 bg-background shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          New Learning Path
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-2">
          <div className="px-3 mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Sessions</h2>
          </div>
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground italic">
              No sessions yet. Start learning something new!
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                  currentSessionId === session.id 
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                )}
                onClick={() => onSelectSession(session.id)}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.topic}</p>
                  <p className="text-[10px] opacity-60">
                    {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-sidebar">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              {profile.preferences.defaultProvider}
            </p>
          </div>
          <ProfileSettings profile={profile} onUpdate={onUpdateProfile} />
        </div>
      </div>
    </div>
  );
}
