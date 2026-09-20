# AI usage log

Tool: Claude Code (agentic CLI). This log records the prompts and the decisions I made, so the process is visible.

## 1. Analysis before building
**Prompt:** Pasted the assessment brief and asked for an analysis before any code.

**Outcome:** The AI identified that the assessment is judged on framing, scale awareness, tests, commit history and deployment, and not on feature count. It proposed insight questions for the HR persona and a scope-in / scope-out split.

**My decisions:**
- Backend: Django REST Framework. Frontend: React + Vite. Free hosting.
- Tests: pytest for the backend, Playwright for end-to-end.
- Requirements doc is written and committed before any code.

## 2. Backend build
**Prompts:** asked for the backend in vertical slices (models, then seed, then API, then insights), each with tests and its own commit.

**Where I steered the AI:**
- Kept the statistics in a pure module (`insights.py`) that works on plain lists, so it is tested without the DB.
- Chose a pay *index* for the gender gap after noting that comparing raw medians would confuse role mix with unequal pay. A test (`test_role_mix_does_not_create_a_fake_gap`) locks this in.
- Outliers are compared like-for-like (same title, level and country) with a minimum group size, so a cheap-country salary is never flagged as an outlier.
- Caught that seeded numbers must be deterministic: the seed uses a fixed reference date, not `today()`.

## 3. Frontend build
**Prompts:** built in three slices (table, write flows, dashboard), verifying each in a real browser before committing.

**Where I steered / what verification caught:**
- Unit test caught a real bug: the compact currency formatter showed "$95.0K" on chart axes (currency style forces 2 decimals), fixed before it reached the UI.
- Dashboard charts follow a dataviz method: one series per chart in a single validated hue, no dual axes, plain-language titles that state the question, hover tooltips, and a table for the "who" question (outliers) instead of a chart.
- Screenshot review caught the job-title chart silently skipping every other label (Recharts auto-thins ticks), so `interval={0}` was set and a Playwright test now asserts all 12 labels.
- A stale console error log looked alarming. Rather than assuming, I reproduced in a fresh Playwright browser (zero errors) and turned that check into a permanent smoke test.
- Playwright e2e covers the full HR flow: server-side validation error, add, raise with reason, history shows both salaries, delete (test cleans up after itself).

## 4. Authentication and UI redesign
**Prompt:** the first UI was functional but plain. Asked for an eye-catching design plus login/logout.

**Auth decisions (mine):**
- Token auth (not cookie sessions) because the API and UI will be on different free-tier domains.
- Every endpoint requires a token; login is rate-limited (20/min) and returns one generic error for unknown user and wrong password, so usernames can't be discovered.
- Logout revokes the token server-side. Trade-off, stated plainly: DRF issues one token per user, so signing out on one device signs out all of them. Acceptable for a single HR persona on sensitive data.
- Test hashing uses a fast hasher (`conftest.py`); real PBKDF2 took the suite from 0.4s to 4.9s.

**Design:** custom theme (Inter, indigo/violet/pink), gradient sidebar, hero summary, KPI cards, gradient charts, avatars/department chips/flags in the table, light and dark mode, responsive with a mobile drawer.

**What screenshot review and the tests caught (each fixed, not waved away):**
- MUI `Grid` inside a `Stack` loses its negative margin: KPI cards were shifted 14px right and clipped on phones. Replaced with CSS grid.
- Chart x-axes silently dropped labels (Recharts thinning), then, once forced on, overlapped on phones. Long labels are now angled.
- A failed e2e run left a test employee behind, which broke the next run's headcount assertion. Cleanup now runs in `afterEach` through the API, so it happens even when the test fails.
- An intermittent e2e failure: `getByLabel('Country')` matched both the filter and a chart's screen-reader label, depending on whether chart data had loaded. Measured (2 failures in 3 runs), diagnosed, fixed with an exact match, then verified stable (4 of 4 clean runs).
- E2E runs serially: tests share one login, and sign-out revokes the token.

## 5. Animated background
**Prompt:** "I don't like the background screen. Make it a little animated and attractive."

**Decisions:** one decorative `AuroraBackground` component in two variants: a bold, dark aurora with drifting blobs, faint grid and rising particles behind the (frosted-glass) login card, and a soft theme-aware wash behind the app. Motion is transform-only (GPU-friendly), the layer is `aria-hidden` with `pointer-events: none`, and `prefers-reduced-motion` turns all animation off.

**Verification, not just eyeballing:** measured the blob positions 5 seconds apart to prove it really animates, confirmed zero console errors, and ran the full e2e suite to prove the decorative layer doesn't intercept clicks. Screenshot review caught a flat top-bar strip cutting across the wash (in both modes) and a light-mode wash too faint to notice; both were fixed.
