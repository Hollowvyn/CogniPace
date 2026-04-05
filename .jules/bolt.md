## 2025-04-04 - React.memo Optimization in List Iterations
**Learning:** In React 19, `useDeferredValue` does not prevent synchronous re-rendering of the entire tree on rapid state changes. For large lists, extracting list items into a `React.memo` component allows the shallow prop comparison to skip synchronous diffing while the deferred query catches up.
**Action:** When extracting large list components (e.g., TableRow), wrap them in React.memo if their parents have rapid state changes.
