# Product Brief

## Product Summary

CogniPace is a Chrome extension that helps users practice coding interview problems with spaced repetition and curated
progression at the same time.

The product is designed for people who want more structure than random LeetCode browsing but less overhead than a full
study platform. It is intentionally extension-first, local-first, and lightweight.

## Target User

The primary user is someone preparing for technical interviews who:

- already uses LeetCode
- wants to remember previously solved problems instead of only grinding new ones
- benefits from curated paths such as Blind 75 or ByteByteGo Coding Patterns 101
- wants guidance in the browser rather than a separate app

## Core Problem

Most interview prep workflows fail in one of two ways:

- users bounce between random problems with weak retention
- users follow a curated list but forget previously practiced material

This product addresses both by combining:

- a recommended problem to review now
- a structured next question in the active course

## Product Principles

- Extension-first
  The product should feel like a browser tool, not a large SaaS application.
- Local-first
  User data lives locally in the extension unless a future decision explicitly changes that.
- Retention plus progression
  Review scheduling and guided traversal should both remain visible.
- Compact and direct
  The main user flow should be fast, obvious, and low-friction.
- Explicit scope
  Future ideas are not current product commitments.

## Primary Surfaces

### Popup

The popup is the main surface and the core MVP interaction. It should answer:

- what should I review now
- what is next in my active course

### LeetCode Page Overlay

The overlay supports in-context logging and review actions while the user is on a LeetCode problem page.

### Dashboard

The dashboard is the secondary control surface for inspection, configuration, analytics, library management, and backup
flow.

### Background Service Worker

This is not a user-facing surface, but it is part of the product runtime and owns the data and scheduling logic.

## Current Scope

The current product includes:

- popup recommendations
- active course next-question guidance
- FSRS-backed review scheduling
- in-page overlay with timer and review controls
- course management views
- library inspection
- analytics
- settings and optional notifications
- import/export backup
- built-in curated sets

## Explicit Non-Goals

These are intentionally out of scope for the current product:

- account creation
- authentication
- cloud sync
- shared team workspaces
- backend services
- generic SaaS dashboard expansion
- large multi-page web app behavior
- roadmap-by-agent interpretation

## Future Candidates

These are possible future directions, not approved work:

- sync across browsers or devices
- more advanced notification strategies
- richer review analytics
- broader course tooling
- future design-system standardization

Any future candidate requires explicit human approval before implementation.

## Success Criteria For The Current Product Stage

The current product stage is successful when a user can:

- open the popup and immediately see the best next review target
- understand the next question in the active course
- log review results from the LeetCode problem page
- inspect progress and weak areas in the dashboard
- adjust settings and backup data without needing an account

## Canonicality Notes

- This document is the product source of truth.
- Feature-level behavior is defined in `docs/features.md`.
- Technical structure is defined in `docs/architecture.md`.
- Visual/design direction is defined in `docs/DESIGN_GUIDELINES.md`.
- `docs/stitch-design-doc.md` is a supporting design artifact, not the product source of truth.
- If this document conflicts with a lower-precedence doc, this document wins until a human resolves the inconsistency.
- PRs that change product scope, user flows, or non-goals should update this file in the same change.
