import { describe, expect, it, vi } from "vitest";

import { DashboardRail } from "../../../src/ui/screens/dashboard/components/DashboardRail";
import { render, screen } from "../support/render";

describe("DashboardRail", () => {
  it("renders compact desktop navigation buttons", () => {
    render(<DashboardRail activeView="dashboard" onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveStyle({
      minHeight: "38px",
    });
    expect(screen.getByRole("button", { name: "Courses" })).toHaveStyle({
      minHeight: "38px",
    });
  });
});
