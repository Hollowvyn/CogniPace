# ADR 0005: Minimal Extension Permissions

## Status

Accepted

## Context

Extensions should request only the permissions needed for the current product behavior. Over-permissioning increases review burden, user distrust, and security risk.

## Decision

Keep extension permissions limited to the smallest set required for the current product workflow and treat permission expansion as a high-scrutiny change.

## Consequences

- permission additions require deliberate review
- feature design should prefer working within the current permission model
- security and trust posture remain tighter

## Revisit Triggers

- a new approved feature cannot be implemented with the current permission set
- Chrome platform changes require a different permission approach
- a documented product decision explicitly expands extension capabilities


# Vitest Skill: Comprehensive Guide & Capabilities

Vitest is a blazing-fast, Vite-native unit testing framework designed for modern web projects. It offers a rich set of features, extensibility, and a focus on developer experience, making testing more efficient and enjoyable by utilizing the same configuration and transformation pipeline as your application.

## Core Features

* Vite Integration: Leverages Vite's build tooling and dev server for incredibly fast Hot Module Replacement (HMR) and near-instant test runs during development. It shares the same config file (vite.config.ts) for a unified setup.
* Performance: Designed for speed with smart test filtering, parallelism, and efficient module handling.
* Jest Compatibility: Offers a Jest-compatible API (expect, describe, it, test, beforeEach, afterEach, etc.), making migration from Jest straightforward as a drop-in replacement.
* Watch Mode: An intelligent watch mode enabled by default that re-runs only affected tests upon file changes, providing rapid feedback.
* ESM & TypeScript First: Built with ESM and TypeScript at its core, offering excellent out-of-the-box support for modern JavaScript features and types.
* In-Source Testing: Allows writing tests directly within your source code files (e.g., placing import.meta.vitest blocks inside the source file), keeping tests close to the code they verify.
* Snapshot Testing: Built-in support for snapshot testing to track changes in UI components or data structures, along with Inline Snapshots.
* Mocking: Powerful mocking capabilities for functions, modules, timers, file system, and globals using vi.fn(), vi.mock(), vi.spyOn(), etc.
* Test Filtering & Tags: Run specific tests based on filenames, test names (using -t or --test-name-pattern), or explicitly assign tags (--tags) to organize and filter runs (e.g., running only e2e or unit tagged tests).
* Test Environment: Supports different test environments seamlessly, such as node, jsdom, happy-dom, and edge-runtime.
* Parallelism: Runs tests in parallel using worker threads by default, configurable for different pools (threads, forks, vmThreads, browser).
* Test Projects (Workspaces): Manage multiple test configurations within a single project or monorepo using vitest.workspace.js.
* Coverage: Integrated code coverage reporting using v8 (default) or istanbul, with various output formats (html, lcov, text, etc.).
* Vitest UI: A beautiful visual interface (--ui) for interacting with tests, viewing results, exploring module graphs, and debugging.
* Browser Mode: Native capability to run tests directly inside a real browser environment for high-fidelity component testing.

## Test Parameterization

Vitest makes data-driven testing highly efficient using test.each or it.each. This feature allows you to run the exact same test logic with different sets of input data and expected outputs, significantly reducing code duplication.

// Parameterized testing using object arrays
test.each([
{ a: 1, b: 1, expected: 2 },
{ a: 1, b: 2, expected: 3 },
{ a: 2, b: 1, expected: 3 },
])('add($a, $b) -> $expected', ({ a, b, expected }) => {
expect(a + b).toBe(expected);
});

// Parameterized testing using template literals
test.each`
  a             | b      | expected
  ${'hello'}    | ${' '} | ${'hello '}
  ${'world'}    | ${'!'} | ${'world!'}
`('concatenates $a and $b into $expected', ({ a, b, expected }) => {
expect(a + b).toBe(expected);
});

## Extensibility & Advanced Usage

Vitest is highly extensible to fit complex enterprise environments and specialized tooling needs:

* Extending Matchers: Add custom matchers to expect using expect.extend() to create domain-specific, expressive assertions.
* Custom Reporters: Develop and utilize custom reporters to format test results according to specific CI/CD needs or project dashboards.
* Custom Pools: For advanced use cases, developers can define custom test execution pools beyond the default threads, forks, vmThreads, and browser pools (a low-level API primarily for library authors).
* Running Tests via API: Vitest provides a programmatic Node.js API (startVitest) to run tests from within external scripts, allowing for deep integration with other tools or highly customized workflows.
* Extending the Test Context: You can inject custom data and functions into the test context via fixtures, heavily inspired by Playwright's fixture model.

## Other Capabilities & Best Practices

* Test Annotations: Use inline comments like // @vitest-environment jsdom at the top of a file to override the default test environment for that specific file.
* OpenTelemetry Support: Integrates seamlessly with OpenTelemetry for tracing, monitoring, and profiling test execution bottlenecks in large projects.
* Advanced Debugging: Supports debugging tests directly within IDEs (like VS Code or WebStorm) or via the Node.js inspector.
* Performance Profiling: Includes tools to profile test performance, helping you identify slow tests, memory leaks, or heavy module resolutions.
