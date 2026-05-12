/**
 * Topics repository — SQLite source of truth for the Topic aggregate.
 *
 * Charter rule: repos throw on failure; the message-router boundary in
 * the SW translates the throw into a `{ ok: false, error }` envelope.
 * No defensive try/catch in here.
 */
import { type Db } from "@platform/db/client";
import * as schema from "@platform/db/schema";
import { asTopicId, type TopicId } from "@shared/ids";
import { eq } from "drizzle-orm";


import type { Topic } from "../../domain/topics/model";

export type TopicEntity = typeof schema.topics.$inferSelect;

export interface UpsertTopicArgs {
  /** Pre-computed canonical id. If omitted, derived from `name`. */
  id?: TopicId;
  name: string;
  description?: string;
  /** Curated catalog seeds pass `false`; user creations default to `true`. */
  isCustom?: boolean;
}

/** Row → domain. Drops null `description` so the domain optional matches. */
export function toTopic(entity: TopicEntity): Topic {
  return {
    id: asTopicId(entity.id),
    name: entity.name,
    ...(entity.description !== null ? { description: entity.description } : {}),
    isCustom: entity.isCustom,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

/** Lists every topic, alphabetised by name. Cheap full-table scan — the
 * registry is small (curated seed is ~30 rows, user customs add a handful).
 */
export async function listTopics(db: Db): Promise<Topic[]> {
  const rows = await db.select().from(schema.topics);
  return rows
    .map(toTopic)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Returns the topic with the given id, or `undefined` if it doesn't exist.
 * `undefined` is a legitimate result here — missing != broken. */
export async function getTopic(
  db: Db,
  id: TopicId,
): Promise<Topic | undefined> {
  const rows = await db
    .select()
    .from(schema.topics)
    .where(eq(schema.topics.id, id));
  return rows[0] ? toTopic(rows[0]) : undefined;
}

/**
 * Inserts a new topic OR renames / re-describes an existing one.
 *
 * For the upsert path SQLite's `ON CONFLICT(id) DO UPDATE` keeps the
 * `is_custom` flag stable (a curated topic remains curated even if a
 * later upsert re-uses the same id) — only mutable fields are updated.
 * `created_at` is preserved by the SQL default + `excluded.created_at`
 * not being assigned in the conflict branch; `updated_at` advances on
 * every write via `nowIso()`.
 */
export async function upsertTopic(
  db: Db,
  args: UpsertTopicArgs,
): Promise<Topic> {
  const trimmedName = args.name.trim();
  if (!trimmedName) {
    throw new Error("upsertTopic: name must be non-empty");
  }
  const id = args.id ?? asTopicId(trimmedName);
  if (!id) {
    throw new Error("upsertTopic: name does not produce a valid id");
  }
  const now = new Date().toISOString();
  await db
    .insert(schema.topics)
    .values({
      id,
      name: trimmedName,
      description: args.description ?? null,
      isCustom: args.isCustom ?? true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.topics.id,
      set: {
        name: trimmedName,
        description: args.description ?? null,
        updatedAt: now,
      },
    });
  const saved = await getTopic(db, id);
  if (!saved) {
    throw new Error(`upsertTopic: insert succeeded but row vanished (id=${id})`);
  }
  return saved;
}

/**
 * Deletes a user-created topic. Refuses to delete curated topics —
 * call sites must check `topic.isCustom` first. Cascading effects:
 *  - `track_groups.topic_id` becomes NULL (FK SET NULL).
 *  - `problems.topic_ids` JSON array is NOT updated by the DB; the
 *    caller is responsible for stripping the id from any problem
 *    that references it.
 */
export async function removeTopic(db: Db, id: TopicId): Promise<void> {
  const existing = await getTopic(db, id);
  if (!existing) {
    throw new Error(`removeTopic: topic not found (id=${id})`);
  }
  if (!existing.isCustom) {
    throw new Error(`removeTopic: refusing to remove curated topic (id=${id})`);
  }
  await db.delete(schema.topics).where(eq(schema.topics.id, id));
}

/**
 * Idempotent catalog seed. Inserts curated topics if absent, leaves
 * user-modified rows (custom topics or renames) intact. Intended for SW
 * boot — Phase 4 is in-memory only, so this runs on every wake.
 */
export async function seedCatalogTopics(
  db: Db,
  seeds: ReadonlyArray<{ id: TopicId; name: string; description?: string }>,
): Promise<void> {
  if (seeds.length === 0) return;
  const now = new Date().toISOString();
  await db
    .insert(schema.topics)
    .values(
      seeds.map((seed) => ({
        id: seed.id,
        name: seed.name,
        description: seed.description ?? null,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing({ target: schema.topics.id });
}
