/**
 * chrome.storage.local key the SW writes a tiny payload to on every
 * SQLite mutation. Extension pages observe `chrome.storage.onChanged`
 * for this key (plus the legacy v7-blob STORAGE_KEY) to know that
 * data may have changed and they should re-fetch.
 */
export const DB_TICK_KEY = "cognipace_db_tick";
