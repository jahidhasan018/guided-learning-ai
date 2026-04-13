import React, { useState, useRef, useEffect } from 'react';
import { LearningSession, Message, RoadmapItem, UserProfile } from '@/types';
import { ChatMessage } from '@/components/ChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { gemini } from '@/lib/gemini';
import { Send, Loader2, BookOpen, RotateCcw, HelpCircle, FileText, ZoomIn, ZoomOut, Maximize2, Paperclip, X, File, Image as ImageIcon, Map } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Timeline } from '@/components/Timeline';
import { parseRoadmap } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface ChatInterfaceProps {
  session: LearningSession;
  profile: UserProfile;
  onUpdateSession: (session: LearningSession) => void;
}

export function ChatInterface({ session, profile, onUpdateSession }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<{ file: File; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('chat-zoom');
    return saved ? parseInt(saved, 10) : 100;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  // Retroactive roadmap parsing for existing sessions
  useEffect(() => {
    if (!session.roadmapItems || session.roadmapItems.length === 0) {
      for (const msg of session.messages) {
        if (msg.role === 'model') {
          const items = parseRoadmap(msg.content);
          if (items) {
            items[0].messageId = msg.id;
            onUpdateSession({ ...session, roadmapItems: items });
            break;
          }
        }
      }
    }
  }, [session.id]);

  useEffect(() => {
    localStorage.setItem('chat-zoom', zoom.toString());
  }, [zoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, isLoading]);

  const handleTimelineItemClick = (item: RoadmapItem) => {
    setIsRoadmapOpen(false);
    if (item.messageId) {
      const element = document.getElementById(`message-${item.messageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newArr = [...prev];
      URL.revokeObjectURL(newArr[index].url);
      newArr.splice(index, 1);
      return newArr;
    });
  };

  const handleSend = async (text: string = input) => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: attachments.map(a => ({
        name: a.file.name,
        type: a.file.type,
        url: a.url
      }))
    };

    const updatedMessages = [...session.messages, userMsg];
    onUpdateSession({ ...session, messages: updatedMessages });
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      // In a real app, we would upload files to a server and send URLs to Gemini
      // For this demo, we'll append the file names to the prompt
      const attachmentContext = userMsg.attachments?.length 
        ? `\n\n[User attached files: ${userMsg.attachments.map(a => a.name).join(', ')}]`
        : '';
      
      const aiResponse = await gemini.sendMessage(session, text + attachmentContext, session.messages, profile);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiResponse,
        timestamp: Date.now(),
      };
      
      let updatedSession = { ...session, messages: [...updatedMessages, aiMsg] };
      
      // Try to parse roadmap
      const items = parseRoadmap(aiResponse);
      if (items) {
        // If we already have items, try to preserve completion status if titles match
        if (session.roadmapItems && session.roadmapItems.length > 0) {
          const updatedItems = items.map(newItem => {
            const existing = session.roadmapItems?.find(old => old.title === newItem.title);
            if (existing) {
              return { ...newItem, isCompleted: existing.isCompleted, isActive: existing.isActive, messageId: existing.messageId };
            }
            return newItem;
          });
          updatedSession.roadmapItems = updatedItems;
        } else {
          // Link the first item to this message
          items[0].messageId = aiMsg.id;
          updatedSession.roadmapItems = items;
        }
      }

      onUpdateSession(updatedSession);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'next' | 'explain' | 'exercise' | 'summarize') => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const aiResponse = await gemini.generateAction(session, action, session.messages, profile);
      const aiMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: aiResponse,
        timestamp: Date.now(),
      };
      
      let updatedSession = { ...session, messages: [...session.messages, aiMsg] };

      // Handle roadmap progression on "next"
      if (action === 'next' && session.roadmapItems) {
        const activeIndex = session.roadmapItems.findIndex(item => item.isActive);
        if (activeIndex !== -1) {
          const newItems = [...session.roadmapItems];
          newItems[activeIndex] = { ...newItems[activeIndex], isActive: false, isCompleted: true };
          if (activeIndex + 1 < newItems.length) {
            newItems[activeIndex + 1] = { 
              ...newItems[activeIndex + 1], 
              isActive: true,
              messageId: aiMsg.id // Link the new lesson message to the roadmap item
            };
          }
          updatedSession.roadmapItems = newItems;
        }
      }

      onUpdateSession(updatedSession);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 80), 150));
  };

  const resetZoom = () => setZoom(100);

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-h-0 relative">
      <Timeline 
        items={session.roadmapItems || []} 
        onItemClick={handleTimelineItemClick}
      />
      
      <div className="h-14 border-b flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <h2 className="font-semibold text-foreground truncate">{session.topic}</h2>
          <div className="hidden sm:flex gap-2 shrink-0">
            <span className="px-2 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded uppercase tracking-wider">
              {session.mode}
            </span>
            <span className="px-2 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded uppercase tracking-wider">
              {session.level}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Sheet open={isRoadmapOpen} onOpenChange={setIsRoadmapOpen}>
            <SheetTrigger render={<Button variant="outline" size="sm" className="md:hidden h-8 gap-1.5" />}>
              <Map className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Roadmap</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle>Learning Roadmap</SheetTitle>
              </SheetHeader>
              <div className="relative">
                {/* We render a vertical list version of the timeline for mobile */}
                <div className="space-y-4">
                  {session.roadmapItems?.map((item, index) => (
                    <div 
                      key={item.id}
                      onClick={() => handleTimelineItemClick(item)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        item.isCompleted 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                          : item.isActive
                            ? 'bg-primary/10 border-primary/20 text-primary'
                            : 'bg-muted border-border text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          item.isCompleted ? 'bg-emerald-500 text-white' : item.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'
                        }`}>
                          <span className="text-[10px] font-bold">{index + 1}</span>
                        </div>
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden sm:flex items-center gap-1 bg-accent p-1 rounded-lg">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleZoom(-10)} />}>
                  <ZoomOut className="w-4 h-4" />
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
              
              <div className="px-2 text-[10px] font-bold text-muted-foreground min-w-[3rem] text-center">
                {zoom}%
              </div>

              <Tooltip>
                <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleZoom(10)} />}>
                  <ZoomIn className="w-4 h-4" />
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetZoom} />}>
                  <Maximize2 className="w-3.5 h-3.5" />
                </TooltipTrigger>
                <TooltipContent>Reset Zoom</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col" style={{ fontSize: `${zoom}%` }}>
          {session.messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex w-full gap-4 px-4 py-8 bg-accent/20">
              <div className="max-w-3xl mx-auto flex gap-4 w-full">
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-1">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guided Learning AI</p>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-2 sm:p-4 border-t bg-background/80 backdrop-blur-sm shrink-0">
        <div className="max-w-3xl mx-auto space-y-2 sm:space-y-4">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 sm:gap-1.5 bg-background px-2 sm:px-3"
                    onClick={() => handleAction('next')}
                    disabled={isLoading}
                  />
                }>
                  <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Next Lesson</span><span className="sm:hidden">Next</span>
                </TooltipTrigger>
                <TooltipContent>Move to the next topic in the roadmap</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger render={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 sm:gap-1.5 bg-background px-2 sm:px-3"
                    onClick={() => handleAction('explain')}
                    disabled={isLoading}
                  />
                }>
                  <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Explain Again</span><span className="sm:hidden">Explain</span>
                </TooltipTrigger>
                <TooltipContent>Get a different explanation of the last concept</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger render={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 sm:gap-1.5 bg-background px-2 sm:px-3"
                    onClick={() => handleAction('exercise')}
                    disabled={isLoading}
                  />
                }>
                  <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Give Exercise</span><span className="sm:hidden">Exercise</span>
                </TooltipTrigger>
                <TooltipContent>Test your knowledge with a task</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger render={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 sm:gap-1.5 bg-background px-2 sm:px-3"
                    onClick={() => handleAction('summarize')}
                    disabled={isLoading}
                  />
                }>
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Summarize</span><span className="sm:hidden">Summary</span>
                </TooltipTrigger>
                <TooltipContent>Get a summary of current progress</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="relative space-y-2"
          >
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group bg-card border rounded-lg p-2 flex items-center gap-2 shadow-sm">
                    {att.file.type.startsWith('image/') ? (
                      <img src={att.url} alt="" className="w-8 h-8 object-cover rounded" />
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                        <File className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="max-w-[150px]">
                      <p className="text-[10px] font-medium truncate text-foreground">{att.file.name}</p>
                      <p className="text-[8px] text-muted-foreground">{(att.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-1.5 -right-1.5 bg-foreground text-background rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="relative flex items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-1 sm:left-1.5 h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your teacher anything..."
                className="pl-10 pr-10 sm:pl-12 sm:pr-12 h-10 sm:h-12 bg-background shadow-sm border-input focus-visible:ring-ring text-sm"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="absolute right-1 sm:right-1.5 h-8 w-8 sm:h-9 sm:w-9 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </form>
          <p className="text-[9px] sm:text-[10px] text-center text-muted-foreground">
            Guided Learning AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
