# Features And Scope

## Scope Model

This document defines current feature behavior and current scope boundaries.

Interpretation rules:

- `Current behavior` describes what the product does today
- `In scope` describes directionally acceptable work when explicitly requested and reviewed
- `Out of scope` describes work that should not be implemented without explicit human approval
- `Future candidates` belong in product conversations, not implementation by default

This document is not an auto-generated backlog. A feature being listed as `In scope` does not authorize self-starting
work by humans or agents.

## Popup Recommendation Flow

### Purpose

Give the user the fastest possible answer to what to do next.

### User Flow

1. User opens the extension popup
2. Popup shows summary metrics
3. Popup shows the recommended problem for the current moment
4. Popup also shows course progression context or a freestyle-mode message in the course panel
5. User opens a problem or shuffles the recommendation

### Current Behavior

- Shows due count and streak
- Shows one current recommendation plus a pool of recommendation candidates
- Shows recommendation and active-course progression as separate popup panels
- Keeps shuffle as a compact recommendation-only action without changing course-next state
- Uses a compact course-panel action to open the dashboard on the courses view
- Keeps the course panel visible in both `studyPlan` and `freestyle`
- Uses explicit course-panel actions to start `studyPlan` or `freestyle` rather than a blind mode toggle
- Applies the selected popup mode immediately as pending local feedback, persists it through settings, and rolls back
  with
  inline error feedback if persistence fails
- Keeps recommendation, course help text, and status feedback inside reserved inline slots so popup actions do not cause
  jumpy reflow
- Keeps one stable course card shell across `studyPlan`, `freestyle`, `no active course`, and `complete` states

### Key States And Edge Cases

- no due recommendation exists
- no active course exists
- active course is fully traversed
- recommended problem is also the next course problem

### In Scope

- better explanation of why a problem is recommended
- better empty states
- clearer course progress cues
- tighter popup hierarchy and usability

### Out Of Scope

- turning the popup into a large multi-panel app
- marketing or landing-page behavior
- auth or cloud state

### Acceptance Criteria

- the user can tell what to review now
- the user can tell what is next in the active course
- shuffle changes only the recommendation
- mode switching is explicit rather than a blind toggle
- popup remains compact and extension-appropriate

## Course Progression

### Purpose

Provide guided traversal through curated learning paths without losing review awareness.

### User Flow

1. User selects or inherits an active course
2. Product tracks current chapter and question progression
3. Popup and dashboard show the next course question
4. Launching questions updates course progress context

### Current Behavior

- supports curated courses and chapters
- tracks active course and active chapter
- computes next question and course completion data
- shows course progress in popup and dashboard, with the popup using a single compact active-course panel that includes
  progress and the up-next question

### Key States And Edge Cases

- no active course
- missing or invalid course ID
- course complete
- question exists in course but not yet in library

### In Scope

- clearer chapter progression cues
- better course switching and ingestion ergonomics
- better visibility into course completion state

### Out Of Scope

- collaborative or shared courses
- server-backed course sync
- full authoring platform for courses

### Acceptance Criteria

- an active course always resolves to a stable next-question view or explicit empty state
- chapter and next-question context are visible where relevant

## LeetCode Page Overlay

### Purpose

Let users review and log progress directly on the LeetCode problem page.

### User Flow

1. User opens a LeetCode problem page
2. Overlay appears in collapsed, expanded, or docked state
3. User starts the timer, solves, takes notes, and records a review result

### Current Behavior

- collapsed, expanded, and docked overlay states
- collapsed overlay prioritizes a compact timer-first strip with expand access
- docked overlay reduces the surface to a narrow recoverable edge trigger with the brand mark only
- docked overlay can be dragged vertically along the right edge during the current docked session
- expanded overlay shows a smaller timer, a target-time reference, and a compact FSRS assessment control
- expanded logging fields include interview pattern, time complexity, space complexity, languages used, and notes
- external clicks collapse the expanded overlay
- collapsing the expanded overlay saves the current structured log fields without creating a new review entry
- submit, failed, save-override, and restart session actions are distinct
- open settings shortcut
- both overlay variants keep helper text and feedback in reserved inline regions so timer and submit states do not shift
  the control layout unexpectedly

### Key States And Edge Cases

- user opens a page with no stored review state
- timer is not used
- review is first solve versus repeat review
- overlay is collapsed but user still needs quick context
- overlay is docked but user still needs a fast in-page restore path
- docked overlay covers page content and needs to move without leaving the viewport
- user edits logs or rating after the current session has already been submitted

### In Scope

- better overlay ergonomics
- safer DOM rendering later
- clearer quick-submit explanation
- better notes/save affordances

### Out Of Scope

- replacing the LeetCode page experience wholesale
- turning the overlay into a full dashboard

### Acceptance Criteria

- a user can log a review result from the problem page
- timer and assessment behaviors are understandable
- structured log fields persist with the associated problem state

## Solve Timer And Quick Submit

### Purpose

Give users lightweight solve-time awareness and a fast logging path.

### User Flow

1. User starts a timer while solving or reviewing a problem
2. Product compares elapsed time with the difficulty-based target
3. User either submits from the compact strip or opens the expanded flow
4. After submit, the current session is locked until the user saves an override or restarts the session
5. Review state updates based on rating, timing, and inferred mode

### Current Behavior

- timer goal is derived from problem difficulty
- user can start, pause, and reset the timer
- collapsed submit derives a conservative default rating, saves immediately, and expands into the full override form
- expanded submit uses the selected FSRS rating directly
- failed is a dedicated submission path that currently maps to `Again`
- failed submissions keep the expanded assessment locked to `Again` until the user restarts the local session
- save override replaces the latest submission instead of appending a new review
- restart opens a fresh local session without mutating persisted review history until the next submit
- successful saved overlay results expand into a compact next-step preview below the actions, preferring the next
  study-mode question and otherwise falling back to the next distinct recommendation
- restarting or starting a fresh local session clears that post-submit next-step preview

### Key States And Edge Cases

- no timer used
- timer exceeds target significantly
- repeat review versus first solve
- user wants explicit override instead of a second submission
- user restarts after submitting and expects a fresh local session with persisted logs prefilled

### In Scope

- clearer wording around timer-driven defaults
- more transparent solve-time interpretation

### Out Of Scope

- competitive timing or leaderboard systems
- cloud analytics based on solve times

### Acceptance Criteria

- users can understand the difference between submit, save override, and restart
- timer state and review outcome relationship is visible

## Notes And Review Overrides

### Purpose

Support lightweight reflection and correction during review logging.

### User Flow

1. User opens the overlay on a problem page
2. User adds or edits structured log fields while solving or reviewing
3. User submits the current session
4. User can still edit the current submission through save override
5. Product persists the structured log content with the problem state and snapshots it with each review

### Current Behavior

- structured log fields are editable before and after submit
- submit appends a new FSRS review event
- save override replaces the latest saved review instead of adding another review
- each review attempt stores a log snapshot alongside the current top-level saved fields

### Key States And Edge Cases

- saved log fields exist before a new session begins
- user changes rating or log details after submit and expects the latest submission to update in place
- user restarts after submit and expects unsaved edits to be discarded in favor of the latest persisted fields

### In Scope

- clearer note persistence and messaging
- stronger override clarity

### Out Of Scope

- collaborative notes
- rich-text notebooks

### Acceptance Criteria

- structured log fields remain associated with the problem
- save override updates the latest submission in place without adding duplicate review history

## Dashboard Overview

### Purpose

Give the user a broader control surface than the popup.

### User Flow

1. User opens the dashboard from the popup or extension page
2. Dashboard loads the app shell and overview data
3. User uses the overview as an entry point into courses, library, analytics, or settings

### Current Behavior

- overview page surfaces recommendation, active course state, and summary metrics
- dashboard acts as the navigation root for the wider extension controls

### Key States And Edge Cases

- no active course exists
- no recommendation is currently available
- empty-state sections still need to preserve navigability

### In Scope

- clearer section hierarchy
- better overview readability

### Out Of Scope

- transforming the dashboard into a generic product shell unrelated to study flow

### Acceptance Criteria

- dashboard overview helps users understand current state at a glance

## Course Management

### Purpose

Support course inspection, course switching, and question ingestion into course paths.

### User Flow

1. User opens the dashboard courses view
2. User inspects course cards and chapter state
3. User switches the active course, changes chapter focus, or adds problems to a course

### Current Behavior

- course cards
- active course selection
- chapter selection
- add-problem-to-course flow

### Key States And Edge Cases

- active course changes after progress already exists
- chapter focus changes without changing the active course
- user adds a problem that is not yet fully represented in the library

### In Scope

- better course management clarity
- clearer course completion and next-step visibility

### Out Of Scope

- collaborative course authoring platform

### Acceptance Criteria

- users can inspect course progress and change the active course intentionally

## Library View

### Purpose

Provide a searchable and filterable view of tracked problems.

### User Flow

1. User opens the dashboard library view
2. User filters or searches for a problem
3. User inspects review state, course membership, and problem metadata

### Current Behavior

- table of tracked problems
- filters by query, course, difficulty, and status
- displays review state summary and course memberships
- shows current retrievability (memory strength) per card with color-coded percentage

### Key States And Edge Cases

- no problems match the current filter
- a problem belongs to multiple course contexts
- imported problems have partial metadata

### In Scope

- better filtering and readability
- stronger empty and edge-state messaging

### Out Of Scope

- external problem sync beyond current extension-owned data

### Acceptance Criteria

- user can find a tracked problem and inspect its current review state

## Analytics

### Purpose

Show retention and workload signals without requiring external analytics infrastructure.

### User Flow

1. User opens the dashboard analytics view
2. Product shows retention and workload summaries derived from local data
3. User uses the metrics to decide whether to review, rebalance, or inspect weak areas

### Current Behavior

- streak
- total reviews
- retention proxy
- due forecast
- weakest problems
- phase distribution

### Key States And Edge Cases

- very little review history exists
- no current weak-problem set can be derived
- metrics trend is useful but should not imply precision beyond local data

### In Scope

- clearer interpretation of metrics
- better visualization of weak/problem areas

### Out Of Scope

- enterprise analytics pipeline
- server-backed analytics warehousing

### Acceptance Criteria

- analytics help the user decide whether retention and workload are healthy

## FSRS Scheduling And Retrievability

### Purpose

Schedule reviews based on memory decay using the FSRS algorithm's retrievability model.

### User Flow

1. User reviews a card and provides a rating (Again/Hard/Good/Easy)
2. FSRS algorithm updates the card's stability and difficulty
3. Product calculates retrievability as memory decays over time
4. Card becomes due when retrievability drops below target retention threshold
5. User can adjust target retention in settings to control review frequency

### Current Behavior

- each reviewed card has a retrievability score (0-100%) representing probability of recall
- retrievability decays over time based on card stability using formula: R = 0.9^(days/stability)
- cards become due when retrievability drops below target retention threshold
- default target retention is 85%
- target retention is adjustable via settings slider (70-95%)
- Library view displays current retrievability per card with color coding:
  - green (≥85%): strong memory
  - yellow (≥70%): needs attention soon
  - red (<70%): due for review

### Key States And Edge Cases

- new cards without reviews show no retrievability (displayed as "—")
- cards with very high stability decay slowly and stay due-free longer
- cards with low stability (difficult or lapsed) decay quickly and come due sooner
- lower target retention means fewer reviews but higher forgetting risk
- higher target retention means more reviews but better long-term retention

### In Scope

- visualization of retrievability trends over time
- per-card retrievability display in queue view
- forecasting based on retrievability decay

### Out Of Scope

- custom FSRS parameter tuning per user
- machine learning optimization of retention targets

### Acceptance Criteria

- users can see current memory strength for each reviewed card
- users can adjust how aggressively cards become due via target retention
- scheduling reflects actual memory decay rather than fixed intervals

## Settings And Notifications

### Purpose

Let users tune study behavior and optional alerting.

### User Flow

1. User opens the dashboard settings view
2. User changes study preferences or notification behavior
3. Product persists settings and uses them in scheduling and alerts

### Current Behavior

- daily limits
- study mode
- active course selection
- review order
- target retention threshold (70-95% slider, default 85%)
- require solve time
- notifications toggle
- quiet hours

### Key States And Edge Cases

- notifications disabled
- quiet hours suppress alerts
- invalid or missing active course falls back to defaults

### In Scope

- better validation and clarity around settings
- better notification UX

### Out Of Scope

- account-synced preferences

### Acceptance Criteria

- settings are understandable and persist reliably

## Import / Export Backup

### Purpose

Allow users to preserve and restore local extension state.

### User Flow

1. User exports a backup from the dashboard
2. Product writes a versioned JSON payload with problems, study states, settings, and course data
3. User later imports a valid backup to restore local state

### Current Behavior

- export backup JSON
- import backup JSON
- validation on import path

### Key States And Edge Cases

- backup JSON comes from an older schema version
- backup JSON is malformed or incomplete
- import replaces existing local state

### In Scope

- clearer backup messaging
- safer import validation over time

### Out Of Scope

- cloud backup
- remote sync

### Acceptance Criteria

- users can export their local state
- users can restore a valid backup without account infrastructure

## Local-First Storage Behavior

### Purpose

Define the current persistence model and its limits.

### User Flow

1. User interacts with popup, overlay, or dashboard
2. Background worker loads and mutates normalized app data
3. Product persists changes to `chrome.storage.local`
4. Export/import provides the manual portability path

### Current Behavior

- app data is stored in `chrome.storage.local`
- product state is normalized into a single application data model
- schema versioning exists in the app data layer

### Key States And Edge Cases

- stored data comes from an older schema
- missing course data is normalized during load
- local-only persistence means state does not automatically follow the user across devices

### In Scope

- stronger validation and migration clarity
- better backup/restore robustness

### Out Of Scope

- backend persistence
- team sync
- multi-device identity

### Acceptance Criteria

- contributors understand that local-first is an intentional product decision, not an incomplete backend
