
import type { ActiveFocus } from "../../../domain/active-focus/model";
import type { SettingsRepository } from "../data/SettingsRepository";
import type { TrackGroupId, TrackId } from "@shared/ids";

/**
 * Curated usecase: set the active Track (and optional active group),
 * or clear the focus entirely by passing `null`. Replaces the prior
 * call-site pattern of assembling a full UserSettings payload just to
 * update `activeFocus`.
 *
 * `null` clears the focus; passing only `id` leaves `groupId` unset.
 */
export async function setActiveTrack(
  repo: SettingsRepository,
  args: { id: TrackId; groupId?: TrackGroupId } | null,
): Promise<void> {
  const activeFocus: ActiveFocus =
    args === null
      ? null
      : { kind: "track", id: args.id, groupId: args.groupId };
  await repo.update({ activeFocus });
}
