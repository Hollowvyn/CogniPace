
## 2024-05-24 - React TableRow Rendering Optimization
**Learning:** Large lists mapping to `TableRow` elements in React (like those in `LibraryView` and `ProblemStatusTable`) suffer from performance issues when parent state changes trigger re-renders for the entire list.
**Action:** Extract the mapping logic into a separate `memo`-ized component (e.g., `MemoizedLibraryRow`, `MemoizedProblemRow`). This ensures that only the list elements whose actual data or props have changed are re-rendered, reducing unnecessary DOM updates and improving UI responsiveness.
