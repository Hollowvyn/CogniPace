## 2025-05-18 - Keyboard Accessibility for Disabled Buttons in Tooltips

**Learning:** When wrapping a disabled `IconButton` with a `<Tooltip>` in Material-UI, it must be wrapped in an additional non-interactive element like `<span>` because tooltips do not fire on disabled elements. However, an empty `<span>` is not keyboard focusable, which means keyboard-only users cannot trigger the tooltip to learn why the button is disabled. If you unconditionally add `tabIndex={0}` to the span, it creates a "double tab stop" when the button is enabled (tabbing to the span, then to the button itself), which is confusing.

**Action:** Ensure that any such wrapper element (`<span>` or `<Box component="span">`) used inside a `<Tooltip>` for a disabled element is conditionally given `tabIndex={isDisabled ? 0 : undefined}` so it can receive focus only when necessary. Also provide an appropriate `aria-label` matching the tooltip title so screen readers can announce its purpose.
