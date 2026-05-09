## 2026-05-08 - Enforce fail-closed authorization for runtime messages

**Vulnerability:** The `assertAuthorizedRuntimeMessage` method was failing open by implicitly returning when `senderUrl` was falsy, allowing unauthorized senders without a URL to bypass the remaining security checks.
**Learning:** Security boundaries must enforce a fail-closed paradigm explicitly, throwing errors or terminating when authorization state is missing or invalid.
**Prevention:** Ensure all authorization functions return false or throw exceptions explicitly for any path that does not represent a proven authorized state.
