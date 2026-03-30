import assert from "node:assert/strict";

import { createEmptyCard } from "ts-fsrs";

import { normalizeSlug } from "../src/domain/problem/slug";
import { sanitizeImportPayload } from "../src/shared/backup";
import {
  createDefaultStudyState,
  CURRENT_STORAGE_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
} from "../src/shared/constants";
import {
  buildActiveCourseView,
  syncCourseProgress,
} from "../src/shared/courses";
import { listStudyPlans } from "../src/shared/curatedSets";
import { buildTodayQueue } from "../src/shared/queue";
import { buildRecommendedCandidates } from "../src/shared/recommendations";
import {
  assertAuthorizedRuntimeMessage,
  canonicalProblemUrlForOpen,
  validateExtensionPagePath,
  validateRuntimeMessage,
} from "../src/shared/runtimeValidation";
import { applyReview } from "../src/shared/scheduler";
import { normalizeStoredAppData } from "../src/shared/storage";
import {
  getFsrsScheduler,
  getStudyStateSummary,
  serializeFsrsCard,
  toFsrsRating,
} from "../src/shared/studyState";
import { Problem, Rating, StudyState } from "../src/shared/types";

function makeProblem(
  slug: string,
  title: string,
  difficulty: Problem["difficulty"] = "Medium"
): Problem {
  return {
    id: slug,
    leetcodeSlug: slug,
    title,
    difficulty,
    url: `https://leetcode.com/problems/${slug}/`,
    topics: [],
    sourceSet: ["Blind75"],
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };
}

function makeScheduledState(nextReviewAt: string): StudyState {
  return {
    ...createDefaultStudyState(),
    lastRating: 2,
    attemptHistory: [
      {
        reviewedAt: "2026-03-10T00:00:00.000Z",
        rating: 2,
        mode: "FULL_SOLVE",
      },
    ],
    fsrsCard: {
      due: nextReviewAt,
      stability: 4,
      difficulty: 5,
      elapsedDays: 4,
      scheduledDays: 4,
      learningSteps: 0,
      reps: 1,
      lapses: 0,
      state: "Review",
      lastReview: "2026-03-10T00:00:00.000Z",
    },
  };
}

function makeLegacyReviewedFixture(
  nextReviewAt: string,
  withHistory = true
): StudyState {
  return {
    ...createDefaultStudyState(),
    attemptHistory: withHistory
      ? [
          {
            reviewedAt: "2026-03-10T00:00:00.000Z",
            rating: 2,
            mode: "FULL_SOLVE",
          },
        ]
      : [],
    lastRating: 2,
    status: "REVIEWING",
    reviewCount: 1,
    lastReviewedAt: "2026-03-10T00:00:00.000Z",
    nextReviewAt,
    intervalDays: 4,
  } as unknown as StudyState;
}

function testLegacyStorageMigrationRebuildsHistoryIntoFsrsCard(): void {
  const migrated = normalizeStoredAppData({
    problemsBySlug: {
      "two-sum": makeProblem("two-sum", "Two Sum", "Easy"),
    },
    studyStatesBySlug: {
      "two-sum": makeLegacyReviewedFixture("2026-03-12T00:00:00.000Z", true),
    },
    settings: {
      activeCourseId: "Blind75",
      dailyNewLimit: 5,
    },
  });

  assert.equal(migrated.settings.activeCourseId, "Blind75");
  assert.ok(migrated.coursesById.Blind75);
  assert.ok(migrated.courseProgressById.Blind75);

  const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
  assert.ok(migrated.studyStatesBySlug["two-sum"]?.fsrsCard);
  assert.equal(summary.reviewCount, 1);
  assert.equal(summary.phase, "Review");
}

function testStorageMigrationPreservesExistingFsrsCardWithoutHistory(): void {
  const scheduled = makeScheduledState("2026-03-12T00:00:00.000Z");
  const migrated = normalizeStoredAppData({
    studyStatesBySlug: {
      "two-sum": {
        ...scheduled,
        attemptHistory: [],
      },
    },
  });

  const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
  assert.equal(summary.nextReviewAt, "2026-03-12T00:00:00.000Z");
  assert.equal(summary.phase, "Review");
}

function testLegacyFallbackConvertsWithoutHistory(): void {
  const migrated = normalizeStoredAppData({
    studyStatesBySlug: {
      "two-sum": makeLegacyReviewedFixture("2026-03-12T00:00:00.000Z", false),
    },
  });

  const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
  assert.equal(summary.nextReviewAt, "2026-03-12T00:00:00.000Z");
  assert.equal(summary.phase, "Review");
}

function testCourseProgressionSelection(): void {
  const data = normalizeStoredAppData({
    settings: {
      activeCourseId: "Blind75",
    },
  });

  data.problemsBySlug["two-sum"] = makeProblem("two-sum", "Two Sum", "Easy");
  data.problemsBySlug["best-time-to-buy-and-sell-stock"] = makeProblem(
    "best-time-to-buy-and-sell-stock",
    "Best Time To Buy And Sell Stock",
    "Easy"
  );
  data.studyStatesBySlug["two-sum"] = makeScheduledState(
    "2026-03-11T00:00:00.000Z"
  );
  data.studyStatesBySlug["best-time-to-buy-and-sell-stock"] =
    makeScheduledState("2026-03-14T00:00:00.000Z");

  syncCourseProgress(data, "2026-03-15T00:00:00.000Z");
  const active = buildActiveCourseView(data, "Blind75");

  assert.ok(active);
  assert.equal(active?.nextQuestion?.slug, "contains-duplicate");
  assert.equal(active?.chapters[0].status, "CURRENT");
}

function testRecommendedAndCourseNextStaySeparate(): void {
  const data = normalizeStoredAppData({
    settings: {
      activeCourseId: "Blind75",
    },
  });

  data.problemsBySlug["two-sum"] = makeProblem("two-sum", "Two Sum", "Easy");
  data.problemsBySlug["best-time-to-buy-and-sell-stock"] = makeProblem(
    "best-time-to-buy-and-sell-stock",
    "Best Time To Buy And Sell Stock",
    "Easy"
  );
  data.studyStatesBySlug["two-sum"] = makeScheduledState(
    "2026-03-01T00:00:00.000Z"
  );
  data.studyStatesBySlug["best-time-to-buy-and-sell-stock"] =
    makeScheduledState("2026-04-01T00:00:00.000Z");

  syncCourseProgress(data, "2026-03-15T00:00:00.000Z");
  const queue = buildTodayQueue(data, new Date("2026-03-15T00:00:00.000Z"));
  const active = buildActiveCourseView(data, "Blind75");
  const recommended = buildRecommendedCandidates(
    queue,
    active?.nextQuestion?.slug
  );

  assert.ok(active?.nextQuestion);
  assert.equal(active?.nextQuestion?.slug, "contains-duplicate");
  assert.equal(recommended[0]?.slug, "two-sum");
  assert.equal(recommended[0]?.alsoCourseNext, false);
}

function testByteByteGoCourseSeed(): void {
  const data = normalizeStoredAppData();
  const summary = listStudyPlans().find((plan) => plan.id === "ByteByteGo101");
  const course = buildActiveCourseView(data, "ByteByteGo101");

  assert.ok(summary);
  assert.equal(summary?.problemCount, 101);
  assert.equal(summary?.topicCount, 19);

  assert.ok(course);
  assert.equal(course?.name, "ByteByteGo Coding Patterns 101");
  assert.equal(course?.totalQuestions, 101);
  assert.equal(course?.totalChapters, 19);
  assert.equal(course?.nextQuestion?.title, "Pair Sum - Sorted");
  assert.equal(course?.nextQuestion?.difficulty, "Easy");
  assert.equal(course?.nextQuestion?.slug, "two-sum-ii-input-array-is-sorted");
}

function testFsrsFirstGoodUsesShortTermLearningStep(): void {
  const first = applyReview({
    rating: 2,
    difficulty: "Medium",
    settings: DEFAULT_SETTINGS,
    now: "2026-03-01T15:00:00.000Z",
  });

  const firstSummary = getStudyStateSummary(
    first,
    new Date("2026-03-01T15:00:00.000Z")
  );
  assert.equal(firstSummary.reviewCount, 1);
  assert.equal(firstSummary.phase, "Learning");
  assert.equal(firstSummary.nextReviewAt, "2026-03-01T15:10:00.000Z");
  assert.equal(first.fsrsCard?.scheduledDays, 0);

  const second = applyReview({
    state: first,
    rating: 2,
    difficulty: "Medium",
    settings: DEFAULT_SETTINGS,
    now: "2026-03-01T15:10:00.000Z",
  });
  const secondSummary = getStudyStateSummary(
    second,
    new Date("2026-03-01T15:10:00.000Z")
  );
  assert.equal(secondSummary.phase, "Review");
  assert.equal(secondSummary.nextReviewAt, "2026-03-03T15:10:00.000Z");
  assert.equal(second.fsrsCard?.scheduledDays, 2);
}

function testEarlyRepeatFollowsRawFsrsOutput(): void {
  const scheduler = getFsrsScheduler();
  let rawCard = createEmptyCard(new Date("2026-03-25T15:00:00.000Z"));

  const first = applyReview({
    rating: 2,
    difficulty: "Medium",
    settings: DEFAULT_SETTINGS,
    now: "2026-03-25T15:00:00.000Z",
  });
  rawCard = scheduler.repeat(rawCard, new Date("2026-03-25T15:00:00.000Z"))[
    toFsrsRating(2)
  ].card;

  const second = applyReview({
    state: first,
    rating: 2,
    difficulty: "Medium",
    settings: DEFAULT_SETTINGS,
    now: "2026-03-25T18:00:00.000Z",
  });
  rawCard = scheduler.repeat(rawCard, new Date("2026-03-25T18:00:00.000Z"))[
    toFsrsRating(2)
  ].card;

  const firstDue = new Date(getStudyStateSummary(first).nextReviewAt!);
  const secondDue = new Date(getStudyStateSummary(second).nextReviewAt!);

  assert.equal(firstDue.getUTCHours(), 15);
  assert.ok(secondDue.getTime() > firstDue.getTime());
  assert.deepEqual(second.fsrsCard, serializeFsrsCard(rawCard));
}

function testSequentialReviewsMatchRawFsrsScheduler(): void {
  const scheduler = getFsrsScheduler();
  const ratings: Rating[] = [2, 2, 2, 1];
  let rawCard = createEmptyCard(new Date("2026-03-01T15:00:00.000Z"));
  let appState: StudyState | undefined;
  let reviewAt = new Date("2026-03-01T15:00:00.000Z");

  for (const rating of ratings) {
    rawCard = scheduler.repeat(rawCard, reviewAt)[toFsrsRating(rating)].card;
    appState = applyReview({
      state: appState,
      rating,
      settings: DEFAULT_SETTINGS,
      now: reviewAt.toISOString(),
    });

    assert.deepEqual(appState.fsrsCard, serializeFsrsCard(rawCard));
    reviewAt = rawCard.due;
  }
}

function testSameMomentRapidResubmitsMatchRawFsrsScheduler(): void {
  const scheduler = getFsrsScheduler();
  const ratings: Rating[] = [3, 3, 3, 2, 2];
  const reviewAt = new Date("2026-03-29T21:00:00.000Z");
  let rawCard = createEmptyCard(reviewAt);
  let appState: StudyState | undefined;

  for (const rating of ratings) {
    rawCard = scheduler.repeat(rawCard, reviewAt)[toFsrsRating(rating)].card;
    appState = applyReview({
      state: appState,
      rating,
      settings: DEFAULT_SETTINGS,
      now: reviewAt.toISOString(),
    });

    assert.deepEqual(appState.fsrsCard, serializeFsrsCard(rawCard));
  }
}

function testRuntimeValidationRejectsUnknownMessageType(): void {
  assert.throws(
    () =>
      validateRuntimeMessage({
        type: "NOT_A_REAL_MESSAGE",
        payload: {},
      }),
    /unknown message type/i
  );
}

function testRuntimeValidationRejectsMissingPayload(): void {
  assert.throws(
    () =>
      validateRuntimeMessage({
        type: "GET_APP_SHELL_DATA",
      } as never),
    /payload must be an object/i
  );
}

function testRuntimeValidationRejectsWrongFieldType(): void {
  assert.throws(
    () =>
      validateRuntimeMessage({
        type: "SAVE_REVIEW_RESULT",
        payload: {
          slug: "two-sum",
          rating: "2",
        },
      }),
    /rating/i
  );
}

function testUnauthorizedSenderIsRejected(): void {
  const message = validateRuntimeMessage({
    type: "UPDATE_SETTINGS",
    payload: {
      studyMode: "freestyle",
    },
  });

  assert.throws(
    () =>
      assertAuthorizedRuntimeMessage(
        message,
        {
          id: "test-extension",
          url: "https://leetcode.com/problems/two-sum/",
        },
        "test-extension",
        "chrome-extension://test-extension/"
      ),
    /unauthorized content-script message/i
  );
}

function testExtensionSenderWithoutUrlIsAccepted(): void {
  const message = validateRuntimeMessage({
    type: "GET_APP_SHELL_DATA",
    payload: {},
  });

  assert.doesNotThrow(() =>
    assertAuthorizedRuntimeMessage(
      message,
      {
        id: "test-extension",
      },
      "test-extension",
      "chrome-extension://test-extension/"
    )
  );
}

function testAllowedContentScriptSenderIsAccepted(): void {
  const message = validateRuntimeMessage({
    type: "SAVE_REVIEW_RESULT",
    payload: {
      slug: "two-sum",
      rating: 2,
    },
  });

  assert.doesNotThrow(() =>
    assertAuthorizedRuntimeMessage(
      message,
      {
        id: "test-extension",
        url: "https://leetcode.com/problems/two-sum/",
      },
      "test-extension",
      "chrome-extension://test-extension/"
    )
  );
}

function testImportSanitizationIgnoresIncomingProblemUrl(): void {
  const sanitized = sanitizeImportPayload({
    version: CURRENT_STORAGE_SCHEMA_VERSION,
    problems: [
      {
        ...makeProblem("two-sum", "Two Sum", "Easy"),
        url: "https://evil.example.com/not-allowed",
      },
    ],
    studyStatesBySlug: {},
  });

  assert.equal(
    sanitized.problems[0]?.url,
    "https://leetcode.com/problems/two-sum/"
  );
}

function testImportSanitizationDropsMalformedEntriesAndNormalizesKeys(): void {
  const sanitized = sanitizeImportPayload({
    problems: [
      makeProblem("two-sum", "Two Sum", "Easy"),
      {
        ...makeProblem("bad", "Bad"),
        leetcodeSlug: "!!!",
      } as Problem,
    ],
    studyStatesBySlug: {
      "Two-Sum": createDefaultStudyState(),
      "%%%": createDefaultStudyState(),
    },
  });

  assert.equal(sanitized.problems.length, 1);
  assert.deepEqual(Object.keys(sanitized.studyStatesBySlug), ["two-sum"]);
}

function testImportSanitizationAcceptsOlderVersionedBackups(): void {
  const sanitized = sanitizeImportPayload({
    version: CURRENT_STORAGE_SCHEMA_VERSION - 1,
    problems: [],
    studyStatesBySlug: {},
  });

  assert.equal(sanitized.version, CURRENT_STORAGE_SCHEMA_VERSION);
}

function testFutureImportVersionIsRejected(): void {
  assert.throws(
    () =>
      sanitizeImportPayload({
        version: CURRENT_STORAGE_SCHEMA_VERSION + 1,
        problems: [],
        studyStatesBySlug: {},
      }),
    /unsupported backup version/i
  );
}

function testCurrentAndVersionlessImportsSucceed(): void {
  const current = sanitizeImportPayload({
    version: CURRENT_STORAGE_SCHEMA_VERSION,
    problems: [],
    studyStatesBySlug: {},
  });
  const legacy = sanitizeImportPayload({
    problems: [],
    studyStatesBySlug: {},
  });

  assert.equal(current.version, CURRENT_STORAGE_SCHEMA_VERSION);
  assert.equal(legacy.version, undefined);
}

function testImportSanitizationDropsMalformedCourseStructures(): void {
  const sanitized = sanitizeImportPayload({
    problems: [],
    studyStatesBySlug: {},
    coursesById: {
      malformed: {
        id: "malformed",
        name: "Malformed",
        description: "bad",
        sourceSet: "Custom",
        chapterIds: ["chapter-1"],
        chaptersById: "bad",
        questionRefsBySlug: {},
      } as never,
      valid: {
        id: "valid",
        name: "Valid",
        description: "ok",
        sourceSet: "Custom",
        chapterIds: ["chapter-1"],
        chaptersById: {
          "chapter-1": {
            id: "chapter-1",
            title: "Chapter 1",
            order: 0,
            questionSlugs: ["Two-Sum"],
          },
        },
        questionRefsBySlug: {
          "two-sum": {
            slug: "two-sum",
            title: "Two Sum",
            url: "https://evil.example.com",
            chapterId: "chapter-1",
            chapterTitle: "Chapter 1",
            order: 0,
            difficulty: "Easy",
          },
        },
      } as never,
    },
    courseProgressById: {
      malformed: {
        courseId: "malformed",
        chapterProgressById: "bad",
      } as never,
      valid: {
        courseId: "valid",
        activeChapterId: "chapter-1",
        startedAt: "2026-03-01T00:00:00.000Z",
        lastInteractedAt: "2026-03-02T00:00:00.000Z",
        chapterProgressById: {
          "chapter-1": {
            chapterId: "chapter-1",
            currentQuestionSlug: "two-sum",
            questionProgressBySlug: {
              "Two-Sum": {
                slug: "Two-Sum",
              },
            },
          },
        },
      } as never,
    },
  });

  assert.deepEqual(Object.keys(sanitized.coursesById), ["valid"]);
  assert.deepEqual(Object.keys(sanitized.courseProgressById), ["valid"]);
  assert.equal(
    sanitized.coursesById.valid?.questionRefsBySlug["two-sum"]?.url,
    "https://leetcode.com/problems/two-sum/"
  );
}

function testSafeOpenHelpersUseCanonicalTargets(): void {
  assert.equal(
    canonicalProblemUrlForOpen(" Two-Sum "),
    "https://leetcode.com/problems/two-sum/"
  );
  assert.equal(
    validateExtensionPagePath("dashboard.html?view=settings"),
    "dashboard.html?view=settings"
  );
  assert.equal(validateExtensionPagePath("database.html"), "database.html");
  assert.throws(
    () => validateExtensionPagePath("https://evil.example.com"),
    /invalid extension path/i
  );
  assert.throws(
    () => validateExtensionPagePath("dashboard.html?view=hax"),
    /invalid dashboard view/i
  );
  assert.throws(
    () => validateExtensionPagePath("dashboard.html?foo=bar"),
    /invalid dashboard path/i
  );
  assert.throws(
    () => validateExtensionPagePath("dashboard.html?view=settings&view=analytics"),
    /invalid dashboard path/i
  );
  assert.throws(
    () => validateExtensionPagePath("../dashboard.html"),
    /invalid extension path/i
  );
  assert.throws(
    () => validateExtensionPagePath("settings.html"),
    /unknown extension path/i
  );
}

function testProblemSlugNormalizationAcceptsUrlsAndSlugNoise(): void {
  assert.equal(
    normalizeSlug(" https://leetcode.com/problems/Two-Sum/?envType=study-plan-v2 "),
    "two-sum"
  );
  assert.equal(normalizeSlug("Problems/merge-intervals/"), "merge-intervals");
}

function run(): void {
  testLegacyStorageMigrationRebuildsHistoryIntoFsrsCard();
  testStorageMigrationPreservesExistingFsrsCardWithoutHistory();
  testLegacyFallbackConvertsWithoutHistory();
  testCourseProgressionSelection();
  testRecommendedAndCourseNextStaySeparate();
  testByteByteGoCourseSeed();
  testFsrsFirstGoodUsesShortTermLearningStep();
  testEarlyRepeatFollowsRawFsrsOutput();
  testSequentialReviewsMatchRawFsrsScheduler();
  testSameMomentRapidResubmitsMatchRawFsrsScheduler();
  testRuntimeValidationRejectsUnknownMessageType();
  testRuntimeValidationRejectsMissingPayload();
  testRuntimeValidationRejectsWrongFieldType();
  testUnauthorizedSenderIsRejected();
  testExtensionSenderWithoutUrlIsAccepted();
  testAllowedContentScriptSenderIsAccepted();
  testImportSanitizationIgnoresIncomingProblemUrl();
  testImportSanitizationAcceptsOlderVersionedBackups();
  testImportSanitizationDropsMalformedEntriesAndNormalizesKeys();
  testFutureImportVersionIsRejected();
  testCurrentAndVersionlessImportsSucceed();
  testImportSanitizationDropsMalformedCourseStructures();
  testSafeOpenHelpersUseCanonicalTargets();
  testProblemSlugNormalizationAcceptsUrlsAndSlugNoise();
  console.log("logic tests passed");
}

run();
