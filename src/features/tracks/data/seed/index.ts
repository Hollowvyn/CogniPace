/**
 * Tracks seed — converts the curated catalog (Blind75, NeetCode150, …)
 * into SQLite rows for the `tracks` / `track_groups` / `track_group_problems`
 * trio. Replaces the legacy `studySetsSeed.ts` (which produced v7-blob
 * StudySet entities).
 *
 * The seed is idempotent: curated rows use deterministic ids
 * (`<planId>` for the track, `<planId>::<sectionIndex>` for the group),
 * so re-running the seed simply upserts the same rows. User-created
 * tracks live in `tracks.isCurated = false` and are never touched here.
 *
 * Charter contract: this file does the planning (compute id / order /
 * topic resolution); the actual SQLite writes flow through the tracks
 * repo so error handling stays consistent.
 */

import { listCatalogPlans , resolveSeedTopicId } from "@features/problems/server";
import {
  asProblemSlug,
  asTrackGroupId,
  asTrackId,
  type ProblemSlug,
  type TopicId,
  type TrackGroupId,
  type TrackId,
} from "@shared/ids";

export interface SeedTrack {
  id: TrackId;
  name: string;
  description?: string;
  orderIndex: number;
}

export interface SeedTrackGroup {
  id: TrackGroupId;
  trackId: TrackId;
  topicId?: TopicId;
  name?: string;
  orderIndex: number;
}

export interface SeedTrackProblemMembership {
  groupId: TrackGroupId;
  problemSlug: ProblemSlug;
  orderIndex: number;
}

export interface SeedTracksPayload {
  tracks: SeedTrack[];
  groups: SeedTrackGroup[];
  groupProblems: SeedTrackProblemMembership[];
}

/** Builds the deterministic seed payload for every curated catalog plan.
 * Pure — does no I/O. */
export function buildTrackCatalogSeed(): SeedTracksPayload {
  const plans = listCatalogPlans();
  const tracks: SeedTrack[] = [];
  const groups: SeedTrackGroup[] = [];
  const groupProblems: SeedTrackProblemMembership[] = [];

  plans.forEach((plan, planIndex) => {
    const trackId = asTrackId(plan.id);
    tracks.push({
      id: trackId,
      name: plan.name,
      description: plan.description,
      orderIndex: planIndex,
    });
    plan.sections.forEach((section, sectionIndex) => {
      const groupId = asTrackGroupId(`${plan.id}::${sectionIndex}`);
      const topicId = resolveSeedTopicId(section.topic) ?? undefined;
      groups.push({
        id: groupId,
        trackId,
        topicId,
        // Carry the section label as the display override so the UI
        // shows "Arrays & Hashing" even when no curated topic id exists.
        name: section.topic,
        orderIndex: sectionIndex,
      });
      section.slugs.forEach((raw, problemIndex) => {
        const slugStr = typeof raw === "string" ? raw : raw.slug;
        groupProblems.push({
          groupId,
          problemSlug: asProblemSlug(slugStr),
          orderIndex: problemIndex,
        });
      });
    });
  });

  return { tracks, groups, groupProblems };
}
