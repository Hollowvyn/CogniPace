/**
 * DAG validation and unlock checks for StudySet groups.
 *
 * A StudySet's groups form a directed acyclic graph via
 * `SetGroup.prerequisiteGroupIds`. Multiple groups may share a prereq;
 * cycles are forbidden. The validator runs at every mutation that adds or
 * changes prerequisites — invalid inputs are rejected at the repository
 * boundary so consumers can rely on the invariant.
 */
import type { SetGroup, StudySet } from "./model";
import type { SetGroupProgress, StudySetProgress } from "./progress";
import type { SetGroupId } from "../common/ids";

/** Returns true when the set's prerequisite graph is acyclic. */
export function isDagAcyclic(groups: readonly SetGroup[]): boolean {
  const groupIds = new Set(groups.map((g) => g.id));
  // Build adjacency: group -> prerequisites it depends on.
  const adjacency = new Map<SetGroupId, SetGroupId[]>();
  for (const group of groups) {
    adjacency.set(
      group.id,
      group.prerequisiteGroupIds.filter((id) => groupIds.has(id)),
    );
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const colour = new Map<SetGroupId, number>();
  for (const id of groupIds) colour.set(id, WHITE);

  const stack: { id: SetGroupId; iter: number }[] = [];
  for (const start of groupIds) {
    if (colour.get(start) !== WHITE) continue;
    stack.push({ id: start, iter: 0 });
    colour.set(start, GRAY);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const neighbours = adjacency.get(frame.id) ?? [];
      if (frame.iter < neighbours.length) {
        const next = neighbours[frame.iter++];
        const nextColour = colour.get(next) ?? WHITE;
        if (nextColour === GRAY) return false; // back-edge → cycle
        if (nextColour === WHITE) {
          colour.set(next, GRAY);
          stack.push({ id: next, iter: 0 });
        }
      } else {
        colour.set(frame.id, BLACK);
        stack.pop();
      }
    }
  }
  return true;
}

/** Topological order of group ids (prerequisites first). Empty array if cyclic. */
export function topoSortGroups(groups: readonly SetGroup[]): SetGroupId[] {
  if (!isDagAcyclic(groups)) return [];
  const groupIds = new Set(groups.map((g) => g.id));
  const indegree = new Map<SetGroupId, number>();
  const adjacency = new Map<SetGroupId, SetGroupId[]>();
  for (const group of groups) {
    indegree.set(group.id, 0);
    adjacency.set(group.id, []);
  }
  for (const group of groups) {
    for (const prereq of group.prerequisiteGroupIds) {
      if (!groupIds.has(prereq)) continue;
      adjacency.get(prereq)?.push(group.id);
      indegree.set(group.id, (indegree.get(group.id) ?? 0) + 1);
    }
  }
  const queue: SetGroupId[] = [];
  for (const [id, deg] of indegree) {
    if (deg === 0) queue.push(id);
  }
  const ordered: SetGroupId[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as SetGroupId;
    ordered.push(id);
    for (const next of adjacency.get(id) ?? []) {
      const nextDeg = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDeg);
      if (nextDeg === 0) queue.push(next);
    }
  }
  return ordered;
}

/**
 * True when the user has completed every problem in each prerequisite
 * group. Groups with no prerequisites are always unlocked. Groups whose
 * prereq references missing groups are treated as locked (defensive).
 */
export function isGroupUnlocked(
  set: StudySet,
  group: SetGroup,
  progress: StudySetProgress | null,
): boolean {
  if (group.prerequisiteGroupIds.length === 0) return true;
  if (set.kind !== "course" || !set.config.enforcePrerequisites) return true;
  if (!progress) return false;
  for (const prereqId of group.prerequisiteGroupIds) {
    const prereqGroup = set.groups.find((g) => g.id === prereqId);
    if (!prereqGroup) return false;
    const prereqProgress: SetGroupProgress | undefined =
      progress.groupProgressById[prereqId];
    if (!prereqProgress) return false;
    const completed = new Set(prereqProgress.completedSlugs);
    for (const slug of prereqGroup.problemSlugs) {
      if (!completed.has(slug)) return false;
    }
  }
  return true;
}
