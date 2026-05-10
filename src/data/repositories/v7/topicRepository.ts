/**
 * Topic aggregate repository — pure mutators on an AppDataV7 draft. No
 * storage IO; the draft is committed by `appDataRepository.mutateAppData`.
 *
 * `now: string` is required on every mutator. Domain code must NEVER call
 * `nowIso()` itself — handlers compute the timestamp once and thread it
 * through.
 */
import type { AppDataV7 } from "../../../domain/data/appDataV7";
import type { Topic } from "../../../domain/topics/model";
import { asTopicId, type TopicId } from "../../../domain/common/ids";

export interface CreateTopicArgs {
  /** Pre-computed canonical id; if omitted, derived from `name`. */
  id?: TopicId;
  name: string;
  description?: string;
  isCustom?: boolean;
}

/** Create or upsert a Topic. Returns the data with the topic registered. */
export function upsertTopic(
  data: AppDataV7,
  args: CreateTopicArgs,
  now: string,
): AppDataV7 {
  const id: TopicId = args.id ?? asTopicId(args.name);
  if (!id || !args.name.trim()) {
    return data;
  }
  const existing = data.topicsById[id];
  const next: Topic = existing
    ? {
        ...existing,
        name: args.name,
        description: args.description ?? existing.description,
        updatedAt: now,
      }
    : {
        id,
        name: args.name,
        description: args.description,
        isCustom: args.isCustom ?? true,
        createdAt: now,
        updatedAt: now,
      };
  data.topicsById[id] = next;
  return data;
}

/** Rename an existing Topic. No-op when the topic is unknown. */
export function renameTopic(
  data: AppDataV7,
  id: TopicId,
  name: string,
  now: string,
): AppDataV7 {
  const existing = data.topicsById[id];
  if (!existing) return data;
  data.topicsById[id] = { ...existing, name, updatedAt: now };
  return data;
}

/**
 * Remove a Topic from the registry and unassign it from all problems and
 * StudySet groups. Refuses to remove curated topics (would break seeded
 * StudySets); call sites must check `isCustom` before invoking.
 */
export function removeTopic(
  data: AppDataV7,
  id: TopicId,
  now: string,
): AppDataV7 {
  const existing = data.topicsById[id];
  if (!existing || !existing.isCustom) return data;
  delete data.topicsById[id];
  for (const slug of Object.keys(data.problemsBySlug)) {
    const problem = data.problemsBySlug[slug];
    const filtered = problem.topicIds.filter((tid) => tid !== id);
    if (filtered.length !== problem.topicIds.length) {
      data.problemsBySlug[slug] = {
        ...problem,
        topicIds: filtered,
        updatedAt: now,
      };
    }
  }
  return data;
}

/** Look up a topic by id (read-only convenience). */
export function getTopic(
  data: AppDataV7,
  id: TopicId,
): Topic | undefined {
  return data.topicsById[id];
}
