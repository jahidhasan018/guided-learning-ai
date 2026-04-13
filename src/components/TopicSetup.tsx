import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LANGUAGES, LEVELS } from '@/lib/constants';
import { LearningLevel, LearningMode } from '@/types';
import { Sparkles, GraduationCap, BookOpen, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopicSetupProps {
  onStart: (topic: string, level: LearningLevel, mode: LearningMode, language: string) => void;
}

export function TopicSetup({ onStart }: TopicSetupProps) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<LearningLevel>('Beginner');
  const [mode, setMode] = useState<LearningMode>('Theory');
  const [language, setLanguage] = useState('English');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onStart(topic.trim(), level, mode, language);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-zinc-50/30">
      <Card className="w-full max-w-lg shadow-xl border-zinc-200/60">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="mx-auto w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">What do you want to learn today?</CardTitle>
          <CardDescription className="text-zinc-500">
            I'll be your personal teacher. Tell me a topic, and we'll dive deep together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Topic or Subject</label>
              <Input
                placeholder="e.g. Quantum Physics, React Hooks, Cooking Pasta..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Learning Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('Theory')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border text-left transition-all",
                    mode === 'Theory' 
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-md" 
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                  )}
                >
                  <BookOpen className={cn("w-5 h-5", mode === 'Theory' ? "text-white" : "text-zinc-400")} />
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-wider">Theory</p>
                    <p className="text-[10px] opacity-70">Concept-focused path</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('Project')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border text-left transition-all",
                    mode === 'Project' 
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-md" 
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                  )}
                >
                  <Rocket className={cn("w-5 h-5", mode === 'Project' ? "text-white" : "text-zinc-400")} />
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-wider">Project</p>
                    <p className="text-[10px] opacity-70">Build production-ready</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Learning Level</label>
                <Select value={level} onValueChange={(v) => setLevel(v as LearningLevel)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Language</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-medium">
              <Sparkles className="w-4 h-4" />
              Start Learning Journey
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
