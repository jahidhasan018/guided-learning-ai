import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { User, Bot, File as FileIcon } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isModel = message.role === 'model';

  return (
    <div 
      id={`message-${message.id}`}
      className={cn(
        "flex w-full gap-4 px-4 py-8",
        isModel ? "bg-accent/20" : "bg-transparent"
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-4 w-full">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1",
          isModel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {isModel ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </div>
        
        <div className="flex-1 space-y-2 overflow-hidden">
          <p className="text-[0.75em] font-semibold text-muted-foreground uppercase tracking-wider">
            {isModel ? 'Guided Learning AI' : 'You'}
          </p>
          <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:text-zinc-100 text-[0.875em]">
            <ReactMarkdown>
              {message.content.replace(/<\/?roadmap>/g, '')}
            </ReactMarkdown>
          </div>

          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {message.attachments.map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-card border rounded-lg hover:bg-accent transition-colors group"
                >
                  {att.type.startsWith('image/') ? (
                    <img src={att.url} alt="" className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                      <FileIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="pr-2">
                    <p className="text-[10px] font-medium text-foreground group-hover:underline truncate max-w-[120px]">
                      {att.name}
                    </p>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-tighter">
                      {att.type.split('/')[1] || 'file'}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
