import type { ProblemView } from "@features/problems";

export interface TrackGroupView {
  id: string;
  name: string;
  /** Optional curated-topic FK (null for user-created or untopic'd groups). */
  topicId: string | null;
  problems: ProblemView[];
  /** Number of slugs in this group whose study_state has at least one
   * non-Again attempt. Used for the `Topic · 5/10` tab label. */
  completedCount: number;
  /** Total number of slugs in the group (denominator). */
  totalCount: number;
}
