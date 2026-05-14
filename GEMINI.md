# CogniPace - Project Context

## Project Overview

CogniPace is a Chrome extension designed for deliberate LeetCode interview practice. It integrates spaced repetition with curated study paths to guide users on what to review and what to study next directly within the browser. 

The application operates on a strict **local-first** architecture. There is no account system and no backend service. All user data is managed within the extension and persisted locally.

## Architecture & Technology Stack

The project relies on a modern frontend stack designed for the constraints of a Chrome Extension Manifest V3 environment:

*   **UI Framework:** React 19
*   **Styling:** Material UI (MUI) and Emotion
*   **Language:** TypeScript
*   **Database:** SQLite-WASM as the Single Source of Truth (SSoT), managed with Drizzle ORM. `chrome.storage.local` is only used for snapshots and mutation ticks.
*   **Bundler:** `esbuild` for TypeScript/React entrypoints.
*   **Testing:** Vitest and Testing Library.

### Key Surfaces
1.  **Popup:** Compact surface for quick reviews, showing due counts, streaks, and recommendations.
2.  **Dashboard:** A full-page React view for library management, tracks, analytics, and settings.
3.  **Overlay:** A Shadow-root-backed React overlay injected directly into LeetCode problem pages to manage timers, notes, and logging.
4.  **Background Service Worker:** Manages the SQLite DB lifecycle, alarms, notifications, and handles message dispatching from UI features.

### Directory Structure
The codebase follows a feature-sliced design:
*   `src/app/`: React surface shells (popup, dashboard, overlay) and dependency injection.
*   `src/features/`: Self-contained feature slices (e.g., analytics, settings, problems, study). Each contains its own data, domain, UI, and messaging layers.
*   `src/design-system/`: MUI-based atomic components and per-surface themes.
*   `src/extension/`: Background scripts, Service Worker API handlers (`swApi.ts`), and message dispatching.
*   `src/platform/`: Chrome API wrappers and database instance/schema configuration.
*   `src/libs/`: Pure utilities like the FSRS spaced-repetition algorithm and typed RPC proxy.

## Development & Building

The project requires **Node 24.x LTS** and uses `npm` for package management.

### Key Commands

*   **Install Dependencies:** `npm install`
*   **Build Extension:** `npm run build`
    *   This outputs the unpacked extension to the `dist` folder. To test, load the `dist` directory via `chrome://extensions` with Developer Mode enabled.
*   **Full Verification:** `npm run check` (Runs linting, type-checking, tests, and build)
*   **Formatting:** `npm run format` (Uses Prettier)
*   **Linting:** `npm run lint` (Uses ESLint)
*   **Type Checking:** `npm run typecheck`
*   **Testing:** 
    *   `npm run test` (UI and logic tests with coverage)
    *   `npm run test:logic` (Runs logic-only tests)
    *   `npm run test:ui` (Runs UI tests)
    *   `npm run test:a11y` (Accessibility tests)

## Data Flow & Constraints
*   **No direct Chrome API calls from UI:** The UI communicates with the Service Worker via a typed RPC proxy (`api.someMethod()`).
*   **Database:** The schema is defined in `src/platform/db/schema/`. Never manually edit generated migrations (`src/platform/db/migrations/`). Use `drizzle-kit generate`.
*   **State:** The UI state is driven by a mutation tick system broadcasting from the background script, automatically refreshing React query hooks when SQLite data changes.
