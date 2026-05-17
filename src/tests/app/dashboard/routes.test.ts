import { getDashboardRoute } from "@app/dashboard/navigation/routes";
import { describe, expect, it } from "vitest";

describe("dashboard routes", () => {
  it("returns dashboard route metadata", () => {
    expect(getDashboardRoute("analytics").label).toBe("Analytics");
  });
});
