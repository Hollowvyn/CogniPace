# Design Guidelines

## Purpose

This document captures the current visual and interaction direction for the extension.

It is a design reference, not the canonical product spec. Product truth lives in `docs/product.md` and
`docs/features.md`.

## Visual Direction

- technical
- compact
- direct
- utility-first
- extension-appropriate

The UI should feel like a sharp browser tool rather than a marketing site or mobile consumer app.

## Popup-First Constraints

- the popup is the primary user-facing surface
- hierarchy should emphasize the best next action immediately
- the layout should remain narrow, compact, and single-column
- dense is acceptable if the information order is clear
- the popup should prefer surface-specific sections over generic dashboard cards
- compact icon actions are preferred over oversized footer buttons when the destination is secondary
- study-mode actions in the popup should name the next action explicitly, for example `Start study mode` or
  `Start freestyle mode`
- popup sections should reserve space for helper copy and inline status so action feedback does not shift the layout
- mode changes should update the existing course panel in place instead of swapping between visually unrelated cards

## Dashboard Guidelines

- the dashboard should feel like an operational control surface
- overview, courses, library, analytics, and settings should stay visually distinct
- the dashboard should not drift into a generic product shell unrelated to study flow
- dashboard shell and settings work should compose local dashboard surface primitives rather than one-off nested paper
  panels
- dashboard sections should use inset rows and grouped controls for dense settings instead of card grids inside cards

## Overlay Guidelines

- the overlay should remain supportive rather than dominant
- quick logging must feel fast
- expanded controls should be available without overwhelming the page
- hidden overlay behavior should minimize to a narrow, always-recoverable edge trigger rather than disappearing
  completely
- dock movement should stay vertical-only, right-edge bound, and visibly recoverable
- collapsed and expanded overlay variants should keep action positions stable as timer and submit state change
- critical guidance should appear as visible helper text; tooltips are secondary clarification, not the only explanation

## Copy And Label Tone

- short
- literal
- operational
- low-fluff

Labels should explain the state directly, for example:

- `Due now`
- `Overdue`
- `Review focus`
- `Next in course`

## UI Hierarchy Rules

- lead with the next action
- keep recommendation and course progression visibly separate
- make secondary controls visually secondary
- use status and difficulty badges sparingly but clearly
- keep the recommendation panel visually strongest, with the active-course panel directly beneath it
- when progress and next-up content belong to the same course flow, keep them in one panel instead of splitting them
  into separate cards

## What Not To Design

- landing pages
- sign-in flows
- generic SaaS dashboards
- large storytelling layouts
- oversized hero sections
- desktop app sidebars inside the popup

## Compact Extension Interaction Principles

- avoid unnecessary navigation
- keep frequent actions one click away
- prefer direct actions over modal workflows
- preserve enough context for the user to decide quickly
- surface errors and confirmations inline near the action that caused them
- use live regions for async feedback and keep helper/status slots mounted even when empty to prevent UI jump

## Relationship To Stitch

The existing Stitch document is a supporting design-generation artifact. This file is the higher-level design reference
that contributors should follow before using or updating Stitch-oriented prompts.
