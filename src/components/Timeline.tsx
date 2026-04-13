import React from 'react';
import { RoadmapItem } from '@/types';
import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimelineProps {
  items: RoadmapItem[];
  onItemClick?: (item: RoadmapItem) => void;
}

export function Timeline({ items, onItemClick }: TimelineProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-4 py-6 px-3 bg-white/40 backdrop-blur-md border border-white/20 rounded-full shadow-2xl">
      <TooltipProvider>
        {items.map((item, index) => (
          <Tooltip key={item.id}>
            <TooltipTrigger>
              <motion.button
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onItemClick?.(item)}
                className={cn(
                  "relative w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300",
                  item.messageId ? "cursor-pointer" : "cursor-default",
                  item.isCompleted 
                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" 
                    : item.isActive
                      ? "bg-zinc-900 ring-4 ring-zinc-900/10"
                      : "bg-zinc-300 hover:bg-zinc-400"
                )}
              >
                {item.isCompleted ? (
                  <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
                ) : item.isActive ? (
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                ) : null}
                
                {/* Connector Line */}
                {index < items.length - 1 && (
                  <div className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-4 my-1 transition-colors duration-500",
                    item.isCompleted && items[index+1].isCompleted ? "bg-emerald-500" : "bg-zinc-200"
                  )} />
                )}
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-zinc-900 text-white border-none p-0 overflow-hidden rounded-lg shadow-xl">
              <div className="flex flex-col">
                <div className="px-3 py-2 flex items-center gap-2 border-b border-white/10">
                  <span className="opacity-50 font-mono text-[10px]">0{index + 1}</span>
                  <span className="text-xs font-medium">{item.title}</span>
                </div>
                {item.messageId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick?.(item);
                    }}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 transition-colors text-left flex items-center gap-1.5"
                  >
                    View Details
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                  </button>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
