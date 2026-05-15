## 2026-05-08 - Enforce fail-closed authorization for runtime messages

**Vulnerability:** The `assertAuthorizedRuntimeMessage` method was failing open by implicitly returning when `senderUrl` was falsy, allowing unauthorized senders without a URL to bypass the remaining security checks.
**Learning:** Security boundaries must enforce a fail-closed paradigm explicitly, throwing errors or terminating when authorization state is missing or invalid.
**Prevention:** Ensure all authorization functions return false or throw exceptions explicitly for any path that does not represent a proven authorized state.
## 2025-05-15 - Prevent Prototype Pollution in RPC Dispatcher

**Vulnerability:** The RPC dispatcher used the `in` operator (`req.method in swApi`) to validate incoming message methods. This allowed inherited `Object.prototype` methods (like `"toString"`) to pass validation.
**Learning:** The `in` operator resolves properties through the entire prototype chain. Using it for input validation against a plain object opens up the possibility of property access beyond the defined keys.
**Prevention:** Always use `Object.hasOwn(obj, key)` or `Object.prototype.hasOwnProperty.call(obj, key)` to strictly check for own properties when validating untrusted keys against a registry object.
