/** Background handlers for catalog set imports and direct problem intake. */
import { getCuratedSet } from "../../../data/catalog/curatedSets";
import {
  mergeSettings,
  mutateAppData,
} from "../../../data/repositories/appDataRepository";
import {
  ensureProblem,
  ensureStudyState,
  importProblemsIntoSet,
  parseProblemInput,
} from "../../../data/repositories/problemRepository";
import { ok } from "../responses";

/** Imports a built-in curated set into the local library. */
export async function importCurated(payload: { setName: string }) {
  const setProblems = getCuratedSet(payload.setName);
  if (setProblems.length === 0) {
    throw new Error(`Unknown curated set: ${payload.setName}`);
  }

  let importResult = { added: 0, updated: 0 };
  await mutateAppData((data) => {
    importResult = importProblemsIntoSet(data, payload.setName, setProblems);
    data.settings = mergeSettings(data.settings, {
      setsEnabled: {
        ...data.settings.setsEnabled,
        [payload.setName]: true,
      },
    });
    return data;
  });

  return ok({
    setName: payload.setName,
    count: setProblems.length,
    added: importResult.added,
    updated: importResult.updated,
  });
}

/** Imports a custom user-defined set into the local library. */
export async function importCustom(payload: {
  setName?: string;
  items: Array<{
    slug: string;
    title?: string;
    difficulty?: "Easy" | "Medium" | "Hard" | "Unknown";
    isPremium?: boolean;
    tags?: string[];
  }>;
}) {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("Custom set import requires at least one item.");
  }

  const normalizedName = payload.setName?.trim() || "Custom";
  let importResult = { added: 0, updated: 0 };

  await mutateAppData((data) => {
    importResult = importProblemsIntoSet(data, normalizedName, payload.items);
    data.settings = mergeSettings(data.settings, {
      setsEnabled: {
        ...data.settings.setsEnabled,
        [normalizedName]: true,
        Custom: true,
      },
    });
    return data;
  });

  return ok({
    setName: normalizedName,
    count: payload.items.length,
    added: importResult.added,
    updated: importResult.updated,
  });
}

/** Adds a problem directly into the library from a slug or URL. */
export async function addProblemByInput(payload: {
  input: string;
  sourceSet?: string;
  topics?: string[];
  markAsStarted?: boolean;
}) {
  const parsed = parseProblemInput(payload.input);
  const updated = await mutateAppData((data) => {
    const problem = ensureProblem(data, {
      slug: parsed.slug,
      url: parsed.url,
      sourceSet: payload.sourceSet,
      topics: payload.topics,
    });
    const state = ensureStudyState(data, parsed.slug);

    return {
      ...data,
      problemsBySlug: {
        ...data.problemsBySlug,
        [problem.leetcodeSlug]: problem,
      },
      studyStatesBySlug: {
        ...data.studyStatesBySlug,
        [problem.leetcodeSlug]: state,
      },
    };
  });

  return ok({
    slug: parsed.slug,
    problem: updated.problemsBySlug[parsed.slug],
    studyState: updated.studyStatesBySlug[parsed.slug],
  });
}
