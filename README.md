# CogniPace

CogniPace is a Chrome extension for deliberate LeetCode interview practice. It combines spaced repetition with curated study paths so you can decide what to review now, what to study next, and how your practice is trending without leaving the browser.

## What It Does

- Recommends what to review now from your spaced-repetition queue
- Shows the next problem in your active course
- Adds a LeetCode page overlay for timing, notes, and review logging
- Includes a dashboard for courses, library management, analytics, settings, and backup

## Quick Start

Requirements:

- Node `24.x` LTS
- `npm`

Install dependencies:

```bash
npm install
```

Run the full local verification:

```bash
npm run check
```

Build the extension for Chrome:

```bash
npm run build
```

Load the extension in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder

After code changes, run `npm run build` again and reload the extension from `chrome://extensions`.

## How It Works

- Local-first: user data stays in the extension
- No account system
- No backend service
- Chrome extension only

The main surfaces are:

- Popup for review-now and next-in-course guidance
- LeetCode overlay for in-page review logging
- Dashboard for inspection, configuration, and analytics

## Tech Stack

- React 19
- MUI + Emotion
- TypeScript
- Chrome Extension Manifest V3
- `esbuild`

## Project Docs

- Product scope: [docs/product.md](docs/product.md)
- Feature behavior: [docs/features.md](docs/features.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Design guidelines: [docs/DESIGN_GUIDELINES.md](docs/DESIGN_GUIDELINES.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security: [SECURITY.md](SECURITY.md)

## Data Attribution

Company-tagged problem sets are derived from the [CodeJeet](https://github.com/codejeet/codejeet) dataset (GPL-3.0-or-later). CogniPace converts the upstream CSVs to JSON at build time. The extension does not scrape LeetCode, store LeetCode credentials, or refresh this data at runtime. Refresh cadence depends on periodic upstream re-runs and CogniPace releases.

## License

Copyright (C) 2026 Tobi Olutimehin and Timi Olaosebikan.

CogniPace is licensed under the [GNU General Public License v3.0 or later](LICENSE). Distribution and modification of this software must comply with the terms of that license, including source-availability obligations for distributed builds.

This is a relicensing from the project's original MIT license. See [docs/decisions/0007-license-change-to-gpl-3-0.md](docs/decisions/0007-license-change-to-gpl-3-0.md) for context.
