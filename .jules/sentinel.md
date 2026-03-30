## 2024-03-30 - Missing noopener/noreferrer on window.open
**Vulnerability:** The application was using `windowRef.open(url, "_blank")` without `noopener` and `noreferrer` attributes when falling back from `chrome.tabs.create`.
**Learning:** Even in extension environments where `chrome.tabs.create` is the primary navigation mechanism, fallback paths for vanilla browser contexts (like `window.open`) can introduce standard web vulnerabilities like reverse tabnabbing.
**Prevention:** Always include `"noopener,noreferrer"` as the third argument to `window.open` when targeting `_blank`, regardless of the primary execution context.
