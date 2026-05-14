import type { EditableProblemField } from "./EditableProblemField";

/** Sticky-edit flags. When a flag is `true`, the corresponding field
 *  survives subsequent imports (LeetCode never gets to overwrite it). */
export type ProblemEditFlags = {
  readonly [K in EditableProblemField]?: true;
};
