import {
  buildDashboardUrl,
  readDashboardViewFromSearch,
} from "@app/dashboard/navigation/routes";
import { describe, expect, it } from "vitest";

describe("dashboard routes", () => {
  it("parses dashboard routes and builds view urls", () => {
    expect(readDashboardViewFromSearch("?view=tracks")).toBe("tracks");
    expect(readDashboardViewFromSearch("?view=unknown")).toBe("dashboard");
    expect(
      buildDashboardUrl(
        "chrome-extension://test/dashboard.html?view=settings",
        "library"
      )
    ).toContain("view=library");
  });
});
