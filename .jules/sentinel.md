## 2024-04-03 - [Inadequate Protocol Validation in URL parsing]
**Vulnerability:** The `isProblemPage` utility used URL parsing to validate hostnames, but completely ignored protocols. It allowed pseudo-protocols like `javascript:` or `data:`, bypassing validation constraints.
**Learning:** Checking hostnames without enforcing the scheme (e.g. `http:` or `https:`) is a common bypass for SSRF or origin checks when using native `new URL()`.
**Prevention:** Always ensure protocol matching (`protocol === "https:" || protocol === "http:"`) when trusting URL instances.
