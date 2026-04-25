import { render, RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactElement, ReactNode } from "react";

import { AppProviders } from "../../../src/ui/providers";

/**
 * Custom wrapper for RTL render that includes theme and context providers.
 */
function AllTheProviders({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}

/**
 * Enhanced render function that wraps components in AppProviders by default.
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  };
}

// Re-export everything from RTL
export * from "@testing-library/react";

// Override the render method
export { customRender as render };
