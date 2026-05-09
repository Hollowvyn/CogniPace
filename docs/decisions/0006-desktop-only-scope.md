# ADR 0006: Desktop-Only Form Factor and Accessibility Scope

## Status

Accepted

## Context

CogniPace is a Chrome MV3 extension. Chrome extensions do not load on Chrome for Android or iOS (rare Canary exceptions aside), the popup is dimensionally bounded by Chrome (around 800x600), and the LeetCode overlay targets desktop problem pages. Mobile accessibility testing (touch-target sizing, mobile gestures, mobile screen readers, narrow viewports) carries no realistic user benefit and dilutes the Palette lane's effective scope.

## Decision

Treat CogniPace as a desktop-only Chrome extension. Scope accessibility work to WCAG 2.1 AA on desktop browsers. No manifest change enforces this because the Chrome extension platform already does, and `form_factors` is a Web App Manifest field, not a Chrome extension manifest field.

## Consequences

- in scope: keyboard navigation and focus order, visible focus indicators, contrast 4.5:1 text and 3:1 UI, semantic HTML and ARIA correctness, NVDA / JAWS / VoiceOver-on-macOS support, reduced-motion respect, MUI baseline accessibility preservation
- out of scope: 44x44px touch targets, mobile gestures, TalkBack and VoiceOver-on-iOS, viewports below typical popup width, responsive breakpoints below desktop
- the Palette lane's accessibility polish work targets the in-scope list only
- a jest-axe or other accessibility test harness is not mandated by this ADR; that remains a separate decision

## Revisit Triggers

- Chrome ships stable extension support on mobile form factors with meaningful adoption
- a product decision adds a non-extension surface such as a web app or mobile companion
- LeetCode itself becomes mobile-primary in a way that changes the overlay's target
