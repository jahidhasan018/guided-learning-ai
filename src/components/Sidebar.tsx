import React from 'react';
import { LearningSession } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, MessageSquare, Trash2, GraduationCap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SidebarProps {
  sessions: LearningSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

export function Sidebar({ sessions, currentSessionId, onSelectSession, onNewSession, onDeleteSession }: SidebarProps) {
  return (
    <div className="w-72 border-r bg-zinc-50/50 flex flex-col h-full">
      <div className="p-4 border-bottom">
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-semibold text-zinc-900 tracking-tight">Guided Learning</h1>
        </div>
        
        <Button 
          onClick={onNewSession}
          className="w-full justify-start gap-2 bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          New Learning Path
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-2">
          <div className="px-3 mb-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recent Sessions</h2>
          </div>
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-zinc-400 italic">
              No sessions yet. Start learning something new!
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                  currentSessionId === session.id 
                    ? "bg-zinc-200/50 text-zinc-900" 
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
                onClick={() => onSelectSession(session.id)}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.topic}</p>
                  <p className="text-[10px] text-zinc-400">
                    {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 rounded transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-white/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">Personal Teacher</p>
            <p className="text-xs text-zinc-500">Gemini 3 Flash</p>
          </div>
        </div>
      </div>
    </div>
  );
}
