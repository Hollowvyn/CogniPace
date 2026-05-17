import { useLibraryVM } from "@features/problems/ui/screens/library/viewmodel/useLibraryVM";
import { createInitialUserSettings } from "@features/settings";
import { describe, expect, it } from "vitest";

import { makePayload } from "../../../../../../support/appShellFixtures";
import { renderHook } from "../../../../../../support/render";

describe("useLibraryVM", () => {
  it("maps dashboard payload into the library screen model", () => {
    const payload = makePayload();

    const { result } = renderHook(() => useLibraryVM(payload));

    expect(result.current.title).toBe("All Tracked Problems");
    expect(result.current.problems).toBe(payload.problems);
    expect(result.current.settings).toBe(payload.settings);
    expect(result.current.tracks).toBe(payload.tracks);
  });

  it("provides empty screen defaults while payload is loading", () => {
    const { result } = renderHook(() => useLibraryVM(null));

    expect(result.current.title).toBe("All Tracked Problems");
    expect(result.current.problems).toEqual([]);
    expect(result.current.tracks).toEqual([]);
    expect(result.current.settings).toEqual(createInitialUserSettings());
  });
});
