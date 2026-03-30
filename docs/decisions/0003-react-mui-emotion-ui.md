# ADR 0003: React + MUI + Emotion UI Stack

## Status

Accepted

## Context

The repo has now fully migrated to React-driven UI surfaces for the popup, dashboard, and LeetCode overlay.

The current implementation already uses:

- React 19 for screen composition and local UI state
- MUI for components, theme primitives, and baseline UI behaviors
- Emotion for styling, theme integration, and shadow-root-safe overlay styling

The product still needs to remain extension-first, compact, and local-first, but the UI model is no longer plain CSS plus direct DOM rendering.

## Decision

Standardize the UI stack on React 19 + MUI + Emotion for the current product stage.

Use:

- `src/entrypoints/*.tsx` as thin React bootstraps
- `src/ui/providers.tsx` for shared providers
- `src/ui/theme.ts` for theme tokens and component overrides
- `src/ui/*` for screens, components, shared features, presentation helpers, and UI state

Keep domain logic outside React and keep Chrome/runtime access out of leaf UI components.

## Consequences

- UI work now assumes React components and TSX entrypoints as the default model
- shared theme and provider setup become part of the repo's frontend contract
- MUI and Emotion are intentional dependencies, not temporary scaffolding
- overlay styling can remain isolated inside a shadow root through Emotion cache injection
- UI testing centers on Vitest and React Testing Library
- styling changes should follow the shared theme/provider model rather than ad hoc CSS or direct DOM rendering

## Revisit Triggers

- the current React + MUI + Emotion stack becomes a measurable performance or bundle-size problem
- the component/styling abstraction cost outweighs the consistency and speed benefits
- overlay styling constraints can no longer be handled cleanly with the current Emotion + shadow-root approach
- a later explicit product or engineering decision chooses a different frontend stack
