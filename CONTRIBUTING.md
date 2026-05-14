# Contributing to CogniPace

Thanks for contributing. Keep changes focused, explain the user-facing reason for the work, and discuss large changes before investing heavily in implementation.

## Development Setup

- Use Node `24.x` LTS
- Use `npm`

```bash
npm install
npm run check
```

## Workflow

- Branch from `main`
- Keep one logical change per pull request
- Summarize the problem and solution clearly in the PR
- For product or feature behavior, read [docs/product.md](docs/product.md) and [docs/features.md](docs/features.md)
- For boundaries, runtime flow, storage, or message contracts, read [docs/architecture.md](docs/architecture.md)
- For visible UI changes, read [docs/DESIGN_GUIDELINES.md](docs/DESIGN_GUIDELINES.md)
- Coding agents must also follow [AGENTS.md](AGENTS.md)

## Project Guardrails

- React 19 + MUI + Emotion are the canonical UI stack
- Keep `src/domain/*` React-free
- Keep `src/entrypoints/*` thin
- UI reads and writes should go through repositories and runtime clients, not direct `chrome.storage` access
- Keep popup, overlay, and dashboard behavior aligned with the product and architecture docs

## Validation And Review

- Run `npm run check` before opening a PR that touches code, tests, public assets, build config, or runtime/tooling config
- For docs-only or governance-only changes, run `npm run format:check`
- If validation fails or cannot be run, say so in the PR and include the relevant failure
- Update tests when behavior changes
- Include screenshots for visible popup, dashboard, or overlay changes
- Use the doc-update rules below when behavior, architecture, design, setup, or process changes

## Security And License

- Do not open public issues or pull requests for vulnerabilities; follow [SECURITY.md](SECURITY.md)
- Contributions should be compatible with the repository's [MIT License](LICENSE)

## Doc Updates

- Update [docs/product.md](docs/product.md) or [docs/features.md](docs/features.md) when behavior changes
- Update [docs/architecture.md](docs/architecture.md) when boundaries, runtime flow, or storage/message contracts change
- Update [docs/DESIGN_GUIDELINES.md](docs/DESIGN_GUIDELINES.md) when visual conventions change
