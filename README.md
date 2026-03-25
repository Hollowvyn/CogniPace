# LeetCode Spaced Repetition Chrome Extension

Chrome extension (Manifest V3) for mastering LeetCode with curated sets and spaced repetition.

## Features

- LeetCode page overlay with rating buttons: `Again`, `Hard`, `Good`, `Easy`
- SM-2 style scheduler with status progression (`NEW` → `LEARNING` → `REVIEWING` → `MASTERED`)
- Popup daily queue with `Freestyle` or `Study plan` mode
- Topic-by-topic guided plans (Blind 75, ByteByteGo Coding Patterns 101, LeetCode 75, Grind 75, NeetCode 150, NeetCode 250)
- Dashboard for imports, settings, analytics, suspend/reset actions, and export/import backup
- Built-in curated sets: `Blind75`, `ByteByteGo101`, `NeetCode150`, `NeetCode250`, `Grind75`, `LeetCode75`
- Local-first storage with `chrome.storage.local`

## Development

Install dependencies:

```bash
npm install
```

Build extension:

```bash
npm run build
```

Load extension in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder

## Data export format

Export JSON includes:

- `problems[]`
- `studyStatesBySlug{}`
- `settings{}`
