# Stitch Design Doc: MVP Chrome Extension

> This file is a supporting design-generation artifact, not the canonical product or architecture spec.
>
> Read these first for source-of-truth context:
>
> - `docs/product.md`
> - `docs/features.md`
> - `docs/architecture.md`
> - `docs/DESIGN_GUIDELINES.md`
>
> Scope note:
>
> - The popup is the primary Stitch target for this doc.
> - The dashboard and LeetCode overlay are current product surfaces, but they are not the main prompt target here.
> - If this file conflicts with the canonical docs above, the canonical docs win.

## 1. MVP Direction

This is a Chrome extension MVP.

Do not design:

- a landing page
- a sign-in flow
- an account system
- a generic SaaS dashboard
- a large multi-page web app

Design the MVP as an extension-first product where the main interaction is:

1. user clicks the extension icon
2. popup opens
3. popup shows the next recommended question
4. user can shuffle to another recommended question
5. popup also shows the next question in the active course
6. clicking either question opens the LeetCode problem page

That is the core MVP.

## 2. MVP Product Summary

The extension helps users practice LeetCode with spaced repetition.

There are two key ideas in the MVP:

1. Recommended question
   This is the best question to do now based on spaced repetition and due reviews.

2. Course progression
   The user can follow an active course.
   A course contains chapters.
   The extension should show the next question in the current course/chapter path.

The popup should make both visible at the same time:

- what should I review now
- what is the next course question

## 3. Primary Stitch Target

The primary Stitch target is the extension popup.

This document is optimized for generating the popup first because it is the narrowest and highest-signal design target.

Other current product surfaces exist:

- LeetCode page overlay
- full-page extension dashboard

They are documented in the canonical product docs and can receive separate design work, but they should not dominate
this popup-oriented prompt.

## 4. MVP Functional Requirements

The popup must support these actions:

1. Show next recommended question
2. Let the user shuffle the recommended question
3. Show next course question
4. Open the LeetCode page when the user clicks a question
5. Allow switching study mode if needed
6. Allow opening the larger dashboard if needed

## 5. Product Model

### 5.1 Recommended Question

The recommended question is the best question to study right now.

It can come from:

- due review items
- overdue items
- current review focus

The UI should explain why it is being shown, using short labels like:

- Due now
- Overdue
- Review focus

### 5.2 Course Question

The course question is the next item in the active course path.

Rules:

- courses contain chapters
- chapters contain questions
- the popup should show the next course question separately from the recommended question

The course question card should also show:

- course name
- chapter name
- question title

### 5.3 Shuffle

The user should be able to shuffle the recommended question.

Shuffle behavior:

- rotates to another valid recommended question
- should not change the course-next question
- should feel like a quick action, not a heavy workflow

## 6. Stitch Constraints

Stitch should generate a compact popup UI.

The popup should feel like:

- a browser tool
- compact
- direct
- utility-first

Do not generate:

- large hero banners
- marketing copy
- multi-section homepage storytelling
- desktop app sidebars inside the popup

Use:

- compact cards
- short labels
- clear buttons
- tight spacing

## 7. Popup Screen Spec

### Screen 1: Extension Popup - MVP

Surface:

- Chrome extension popup

Goal:

- let the user immediately open the best next LeetCode problem

Layout:

- narrow popup layout
- single-column
- strong hierarchy

Sections:

1. Header

- title: LeetCode Reviews
- optional small refresh action

2. Summary row

- due count
- streak or optional secondary metric

3. Recommended question card

- section title: Recommended Now
- question title
- difficulty
- short reason badge:
  - Due now
  - Overdue
  - Review focus
- open CTA
- shuffle CTA

4. Course next card

- section title: Next In Course
- active course name
- active chapter name
- next question title
- open CTA

5. Footer actions

- optional mode selector
- open dashboard

## 8. Popup Behavior Details

### 8.1 Recommended Question Card

Must show:

- problem title
- difficulty
- why it is recommended now

Actions:

- clicking the title or open button opens LeetCode
- clicking shuffle changes the recommendation

If no recommended question exists:

- show a compact empty state
- if a course question exists, emphasize that instead

### 8.2 Course Next Card

Must show:

- course name
- chapter name
- next question title

Actions:

- clicking opens the LeetCode page for that question

If there is no active course:

- show “No active course”
- optional CTA: choose course in dashboard

### 8.3 Relationship Between The Two Cards

These are separate concepts and should not be merged.

Recommended question:

- best question to do now for retention

Course next question:

- next question in structured learning path

Sometimes they may be the same question.
If they are the same, the UI can show a small label like:

- Also your next course question

## 9. Suggested Visual Direction

Use a clean, technical extension aesthetic.

Recommended style:

- dark or neutral popup background
- one accent color for action
- compact problem cards
- pill badges for status and difficulty
- clear primary CTA for opening the problem
- secondary icon/button for shuffle

The popup should feel more like:

- a sharp developer utility

and less like:

- a consumer mobile product

## 10. Other Current Surfaces

These are not the main target of this prompt, but they are part of the current product:

1. Full-page dashboard

- analytics
- course management
- problem database

2. LeetCode page overlay

- timer
- review buttons
- notes

Do not let these surfaces dominate the popup prompt.

## 11. Exact Prompt Summary For Stitch

Use this prompt with Stitch:

"Design a Chrome extension popup for CogniPace, a spaced repetition tool for coding practice. This is not a landing page
or web app. The popup should be compact and utility-first. It must show: (1) the next recommended question to do right
now, based on spaced repetition, with a shuffle action; and (2) the next question in the active course, where courses
contain chapters. Each card should open the problem page when clicked. The recommended question and the course-next
question are separate UI elements and should both be visible. Include a small summary row and an optional footer action
to open a larger dashboard. Keep the design tight, technical, and appropriate for a browser extension popup."
