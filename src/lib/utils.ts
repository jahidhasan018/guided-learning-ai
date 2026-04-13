import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { RoadmapItem } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseRoadmap(content: string): RoadmapItem[] | null {
  const match = content.match(/<roadmap>([\s\S]*?)<\/roadmap>/);
  if (!match) return null;
  return match[1]
    .split('\n')
    .map(line => line.trim().replace(/^[-*]\s*/, ''))
    .filter(Boolean)
    .map((title, index) => ({
      id: `item-${index}`,
      title,
      isCompleted: false,
      isActive: index === 0
    }));
}
