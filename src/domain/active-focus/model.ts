/**
 * ActiveFocus — the user's currently selected work surface. Lives on
 * UserSettings (replaces v6 `activeCourseId`). The `kind` discriminator is
 * kept for forward-compat with future variants (e.g. `{ kind: 'queue' }`).
 */
import type { SetGroupId, StudySetId } from "../common/ids";

export type ActiveFocus =
  | {
      readonly kind: "studySet";
      id: StudySetId;
      /** Optional: when the focused set is grouped, which group is active. */
      groupId?: SetGroupId;
    }
  | null;
