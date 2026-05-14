# Repository Guidelines

## Project Structure & Module Organization

CogniPace is a React 19 + TypeScript Chrome MV3 extension. Source lives under `src/`.
Use `src/entrypoints/` only for thin extension entry files and runtime bootstrap,
`src/app/bootstrap/` for shared provider/DI composition, `src/app/` surface folders
for popup, dashboard, and overlay shells, and `src/extension/background/` for
service-worker registration and dispatch. Feature code belongs in
`src/features/<name>/` using `data`, `domain`, `ui`, and `messaging` sublayers where
relevant. Shared pure utilities belong in `src/libs/` or `src/shared/`; platform
adapters belong in `src/platform/`. Tests live in `src/tests/`. Public HTML,
manifest, CSS, and icons live in `public/`; generated build output goes to `dist/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies; use Node `24.x` (`.nvmrc`/Volta pin).
- `npm run build`: generate icons and bundle the extension into `dist/`.
- `npm run check`: run lint, typecheck, all test suites, a11y tests, and build.
- `npm run test`: run Vitest with coverage.
- `npm run test:logic`: run the logic-focused Vitest config.
- `npm run test:a11y`: run `*.a11y.test.tsx` accessibility tests.
- `npm run format:check`: verify Prettier formatting for docs-only changes.
- `npm run check:cycles`: detect circular imports in `src/`.

## Coding Style & Naming Conventions

Use 2-space indentation, LF line endings, UTF-8, final newlines, semicolons, double
quotes, and trailing commas where valid. Run `npm run format` before large edits.
Prefer named exports and explicit TypeScript types at module boundaries. React
components use `PascalCase.tsx`; hooks use `useThing.ts`; tests use
`*.test.ts`/`*.test.tsx` or `*.a11y.test.tsx`.

## Architecture Guardrails

Keep domain code React-free and `chrome`-free. UI should use typed `api.*` proxies
and feature datasources instead of direct storage access. New database access should
accept a `Db` argument; call `getDb()` only from service-worker handlers. For schema
changes, edit `src/platform/db/schema/` and generate migrations with Drizzle; do not
hand-edit migration SQL.

## Testing Guidelines

Use Vitest, React Testing Library, `@testing-library/user-event`, and `vitest-axe`.
Place shared test setup in `src/tests/support/`. Add or update tests whenever
behavior changes, especially for feature contracts, architecture boundaries, and
visible React states.

## Commit & Pull Request Guidelines

Recent history uses short conventional prefixes such as `feat(tracks):`,
`feat(db):`, `docs:`, `arch:`, `security:`, and `chore(deps):`. Keep commits scoped
to one logical change. PRs should describe the problem and solution, link related
issues when available, note validation run, and include screenshots for popup,
dashboard, or overlay UI changes. Update `docs/product.md`, `docs/features.md`,
`docs/architecture.md`, or `docs/DESIGN_GUIDELINES.md` when behavior, architecture,
or visual conventions change.
