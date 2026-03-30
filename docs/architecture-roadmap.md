# Architecture Roadmap

> This file is a working plan for architectural refactors.
>
> It is non-canonical and subordinate to:
>
> - `docs/product.md`
> - `docs/features.md`
> - `docs/architecture.md`
>
> Use this document to stage incremental implementation work and track execution order. If this file conflicts with the canonical docs above, the canonical docs win until the implementation lands and those docs are updated in the same PR.
>
> React-baseline note:
>
> - This roadmap now assumes the React migration has already landed.
> - Older assumptions about plain CSS, direct DOM-rendered UI, or deferring a framework decision are superseded by `docs/architecture.md` and ADR `0003-react-mui-emotion-ui.md`.

## Goal And Constraints

The goal of this roadmap is to make the extension easier to evolve without changing the current product scope or losing the current runtime boundaries that already fit the MVP.

This roadmap is constrained by the current product brief and ADRs:

- extension-first, not a large SaaS web app
- local-first persistence using `chrome.storage.local`
- no backend service
- no account system
- popup-first workflow with dashboard and in-page overlay as supporting surfaces
- background service worker remains the canonical mutation boundary
- React 19 + MUI + Emotion remain the canonical UI stack unless a later, explicit decision changes it

This roadmap is execution-ordered. It is intended to let future implementation happen phase by phase without re-deciding the target architecture each time.

## Current Architectural Pain Points

The current architecture is directionally correct for the product, but several pressure points make future work riskier than necessary:

- `src/background.ts` concentrates routing, orchestration, mutation logic, import/export behavior, and notification wiring in one file.
- Runtime messaging has typed request names but weakly typed response handling and limited payload validation.
- Import and open-path flows need stricter canonicalization and validation so local backup flows do not become a trust boundary gap.
- UI surfaces duplicate formatting, escaping, and presentation mapping logic across popup, dashboard, and overlay code.
- The React layer still needs stronger discipline around provider ownership, shared presentation helpers, and repository usage boundaries.
- Storage normalization, migration behavior, and export versioning are coupled more loosely than they should be for long-term maintainability.
- The dashboard and overlay both have growing local state complexity that would benefit from clearer controller and query boundaries within the current React architecture.

## Target End-State Architecture

The intended target architecture remains extension-native and local-first, but now assumes the current React-aligned layout:

- `src/entrypoints/` stays as thin bootstrap code only.
- `src/ui/` owns React screens, components, providers, theme, UI state, and presentation helpers.
- `src/data/` owns repositories, datasources, import/export helpers, and catalog access.
- `src/domain/` owns pure business logic such as queue building, FSRS scheduling, course progression, analytics, and recommendations.
- `src/extension/` owns runtime contracts, validation, background routing, and notifications.
- `background` remains the only mutation boundary for persisted application state.

The target end state explicitly does not include:

- a backend service
- an account model
- cross-device sync
- a large multi-page SPA rewrite
- replacing the current React + MUI + Emotion stack by default

### Planned Interface Direction

The following interface changes are planned and should be treated as the intended direction for future implementation work:

- Runtime messaging should move from typed request names plus `unknown` responses to typed request and typed response contracts.
- Background runtime code should become a message gateway plus domain-oriented handler modules instead of a single, large orchestration file.
- Storage should expose explicit migration and version interfaces rather than mixing normalization, migration, and persistence concerns in one place.
- Problem opening should move behind a centralized safe helper rather than using ad hoc URL handling in multiple UI surfaces.
- Shared UI helpers should stay limited to presentation, mapping, theming, and safe rendering concerns. They should not own persistence or business logic.
- Repositories should remain the only bridge between React surfaces and runtime/storage access.
- No new user-facing surface should be introduced as part of this roadmap unless the product brief changes first.

## Phased Implementation Roadmap

### Phase 0: Hardening And Guardrails

Establish safety rails before larger structural refactors.

Planned work:

- Canonicalize problem URLs and add a safelist for open-path behavior so imported backups cannot cause arbitrary URL opens.
- Treat import as a strict validation and canonicalization boundary before imported data touches the stored app aggregate.
- Add a concrete plan for runtime message sender validation and payload validation at the background boundary.
- Review manifest exposure, especially `web_accessible_resources` scope and any permission that may be broader than current product needs.
- Unify storage schema version and export version handling so version drift cannot happen silently.

Implementation intent:

- Keep behavior the same for valid user flows.
- Reduce security and integrity risk before modularization starts.
- Avoid expanding product scope while hardening existing behavior.

Verification expectations:

- Imported backups cannot cause arbitrary URL opens.
- Invalid payloads and invalid messages are rejected by design.
- Manifest tightening does not break popup, dashboard, or supported page flows.

### Phase 1: Background Modularization

Break the background worker into clearer units without changing behavior.

Planned work:

- Split background runtime code into a router, domain-oriented handlers, and notification or platform service modules.
- Keep the background worker as the only persisted-state mutation boundary.
- Define typed response contracts alongside existing message request contracts.
- Preserve existing message names and product behavior unless a separate product change explicitly requires otherwise.

Implementation intent:

- Reduce the `background.ts` bottleneck.
- Make message flows easier to test and evolve.
- Keep Chrome platform APIs at infrastructure edges rather than mixed into domain logic.

Verification expectations:

- `GET_APP_SHELL_DATA`, `SAVE_REVIEW_RESULT`, import/export, settings updates, and course actions behave identically to current behavior.
- Notification scheduling and quiet-hours behavior remain unchanged.
- No UI surface starts mutating persisted state directly.

### Phase 2: Data And Domain Hardening

Clarify domain boundaries and make local persistence more durable.

Planned work:

- Introduce an explicit storage migrator chain by schema version.
- Refactor storage into a thinner adapter that loads, saves, and coordinates migration or write-conflict handling.
- Separate command-oriented mutation flows from query-oriented projection building in background handlers.
- Make popup, dashboard, library, analytics, and active-course payloads explicit read models or projections, never persisted state.
- Decide and document the concurrency strategy for read-modify-write flows, including write-race handling and revision tracking if needed.

Implementation intent:

- Preserve `AppData` as the local aggregate for the current product stage.
- Keep domain logic pure where possible and persist only after domain work is complete.
- Ensure import, migration, and projection building are explicit, testable layers.

Verification expectations:

- Migrations work across supported schema versions.
- Import/export round-trips preserve valid state.
- Course progress and review state stay coherent after all mutations.
- The stored aggregate remains the single local source of truth.

### Phase 3: UI Architecture Hardening

Improve UI structure within the current React architecture.

Planned work:

- Add a small shared UI layer for formatters, status or badge mapping, theme-aware helpers, and view-model mapping.
- Reduce duplicated escape, format, and tone logic across popup, dashboard, and overlay implementations.
- Decompose larger popup, dashboard, and overlay renderers into smaller units with clearer responsibilities.
- Formalize per-surface state handling, especially overlay workflow state such as timer, review controls, notes, and collapse or expand state.
- Keep provider, theme, and repository usage patterns consistent across popup, dashboard, and overlay screens.

Implementation intent:

- Keep the popup compact and fast.
- Keep the overlay isolated to the content-script runtime.
- Improve maintainability without introducing product-scope drift or a new frontend stack migration by default.

Verification expectations:

- Popup remains compact, extension-appropriate, and fast to load.
- Overlay continues to work on supported LeetCode problem pages.
- Dashboard view switching, filtering, and data refresh remain stable.
- Shared UI helpers do not take on persistence or domain logic responsibilities.

### Phase 4: Test And Verification Expansion

Lock in the refactor with stronger test coverage and explicit gates.

Planned work:

- Add message-contract integration tests around the background boundary.
- Add import/export durability tests, including malformed or malicious backup fixtures.
- Add URL fuzz and validation coverage for problem-opening paths.
- Add tests for view-model mapping and shared rendering helpers.
- Define phase-level acceptance checks that must pass before the next phase begins.

Implementation intent:

- Use tests to preserve behavior while internals change.
- Expand coverage around boundaries that are most likely to regress during refactors.
- Keep the verification suite aligned with current product behavior rather than speculative future features.

Verification expectations:

- The regression suite covers runtime contracts, malicious imports, and core domain projections.
- Refactors can be staged without reintroducing already-fixed security or integrity issues.
- Future changes have clear guardrails before deeper structural work continues.

## Phase Exit Criteria And Verification Gates

Each phase should be considered complete only when both implementation and verification are done.

### Exit Gate For Phase 0

- Safe URL handling is enforced for imports and open actions.
- The validation plan for runtime messages is implemented or concretely scaffolded for the next phase.
- Versioning and manifest review outcomes are documented in code and docs where applicable.

### Exit Gate For Phase 1

- Background routing, handlers, and service responsibilities are separated.
- Typed response contracts exist for the main message flows touched by the refactor.
- Product behavior is unchanged for existing user flows.

### Exit Gate For Phase 2

- Migration behavior is explicit and test-covered.
- Query and command responsibilities are clearer than the current mixed model.
- Projection payloads are clearly derived from current stored state rather than treated as semi-persisted structures.

### Exit Gate For Phase 3

- Shared UI helpers exist and are reused across more than one surface.
- Large renderer files are decomposed enough that new UI changes do not require editing one monolithic render path.
- Popup, dashboard, and overlay behavior remain stable and aligned with the product brief.

### Exit Gate For Phase 4

- Test coverage exists at the message, import/export, URL-handling, and UI-helper boundaries.
- The suite is strong enough to support later refactors without relying on manual regression checks alone.

## Explicit Non-Goals And Revisit Triggers

### Non-Goals For This Roadmap

- Building a backend service
- Adding authentication or accounts
- Introducing cloud sync
- Expanding into a large multi-page web app
- Replacing the extension-first workflow with a general browser product
- Swapping away from the current React + MUI + Emotion stack as part of this roadmap by default

### Revisit Triggers

The roadmap should be revisited if any of the following become approved product requirements:

- cross-device or cross-browser sync
- server-side processing or hosted analytics
- materially broader dashboard complexity than the current product brief supports
- a proven need to replace the current React + MUI + Emotion stack due to bundle size, complexity, or extension-runtime limitations
- Chrome platform changes that materially affect MV3 background, messaging, or permissions behavior

## Working Rules For Incremental Execution

When implementing work from this roadmap:

- update canonical docs in the same PR when runtime structure, message contracts, or persisted data shapes actually change
- prefer incremental refactors that preserve current behavior
- do not treat future phases as implementation authorization before the current phase is complete
- do not use this roadmap to justify product-scope expansion
