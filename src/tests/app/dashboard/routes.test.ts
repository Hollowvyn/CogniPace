import {
  getDashboardRoute,
  getDashboardViewForPathname,
} from "@app/dashboard/navigation/routes";
import { describe, expect, it } from "vitest";

describe("dashboard routes", () => {
  it("maps router pathnames to dashboard route metadata", () => {
    expect(getDashboardViewForPathname("/tracks")).toBe("tracks");
    expect(
      getDashboardViewForPathname("/problems/two-sum/edit", "tracks")
    ).toBe("tracks");
    expect(getDashboardViewForPathname("/problems/new", "library")).toBe(
      "library"
    );
    expect(getDashboardViewForPathname("/problems/new")).toBe("dashboard");
    expect(getDashboardViewForPathname("/unknown")).toBe("dashboard");
    expect(getDashboardRoute("analytics").label).toBe("Analytics");
  });
});
