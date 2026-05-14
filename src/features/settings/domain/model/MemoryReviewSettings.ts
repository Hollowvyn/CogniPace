import type { ReviewOrder } from "./ReviewOrder";

export interface MemoryReviewSettings {
  targetRetention: number;
  reviewOrder: ReviewOrder;
}
