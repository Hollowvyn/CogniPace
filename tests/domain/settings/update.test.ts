import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { cloneUserSettings, createInitialUserSettings } from "../../../src/domain/settings";

describe("settings update helpers", () => {
  it("preserves activeFocus when cloning settings drafts", () => {
    const settings = {
      ...createInitialUserSettings(),
      activeFocus: {
        kind: "studySet" as const,
        id: "blind-75" as never,
        groupId: "blind-75::arrays" as never,
      },
    };

    const cloned = cloneUserSettings(settings);

    assert.deepEqual(cloned.activeFocus, settings.activeFocus);
    assert.notEqual(cloned.activeFocus, settings.activeFocus);
  });
});
