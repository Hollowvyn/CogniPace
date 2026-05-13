import type { QueueItem } from "./QueueItem";

export interface TodayQueue {
  generatedAt: string;
  dueCount: number;
  newCount: number;
  reinforcementCount: number;
  items: QueueItem[];
}
