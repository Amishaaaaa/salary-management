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

## 6. Richer animated background
**Prompt:** "Make a little more animation", then, after seeing floating squares/circles: "remove that square and circle, make it more animated, make it look good."

**What changed:** removed all geometric shapes and pulse rings. Replaced them with flowing motion: four swaying aurora curtains, three layered rolling waves along the bottom (seamless loop: the wave path is drawn twice and translated by -50%), four glowing light lines that stream across using an animated stroke dash, plus the rotating beam, twinkling stars, streaks, particles, and mouse parallax.

**A bug I introduced and caught:** my regex to delete the old `.aurora-ring` rule also matched inside the `prefers-reduced-motion` block and fused two rules, which would have left the beam and stars animating for users who asked for reduced motion. I noticed it when grepping for leftovers, rewrote the block, checked brace balance, and re-measured that every layer's `animation-name` resolves to `none` under reduced motion.

**Verification:** each new layer's computed transform / dash offset changes over 3 s, 60 fps in software rendering, zero console errors, full e2e + unit + build green. Screenshot review noticed a thin light line reading as a strikethrough across the headline, so the lines were softened.

## 7. Adjustable sidebar
**Prompt:** "Make the nav bar adjustable." Ambiguous, so I covered the reasonable readings: collapsible (button) and resizable (drag), both remembered.

**Design:** sizing rules live in a React-free module (`sidebar.ts`) with unit tests: free-follow while dragging, snap to the 76px icon rail if released under 150px, never settle in an unusably narrow width, keyboard steps of 16px, corrupt/missing saved values fall back to the default. The layout adds a collapse button, a drag handle, and an icon-only rail with tooltips. Accessibility: the handle is a real `role="separator"` (focusable; arrows resize, Home collapses, Enter/double-click resets); the toggle has `aria-expanded`; the mobile drawer is unchanged.

**Verification:** Playwright drives the real interaction (button, mouse drag with pointer capture, keyboard, reload persistence) and asserts measured widths with polling instead of sleeps, since the width animates.

---

# Appendix A: The prompts, verbatim

Every instruction I gave the AI in this project, in order, exactly as typed (typos and voice-dictation artefacts left in on purpose, since editing them would defeat the point). Each one is mapped to the commits it produced, so the history can be read alongside it.

The AI tool was **Claude Code** (an agentic CLI: it reads files, runs commands and tests, and edits code in my repo). The assessment brief was pasted in full in prompts 1 and 14; it is not reproduced here.

## How I worked with it
- **Small, conversational prompts, then review.** I gave direction and constraints; the AI proposed and built; I reviewed the running result and redirected.
- **Analysis before code** (prompt 1), and **requirements before code**: nothing was built until the scope was written down.
- **I interrupted and redirected several times** (prompts 3, 6, and the rejected commit after prompt 9). The AI was not left to run unattended.
- **Verification was part of every step**: tests, real-browser checks and screenshots, not just "it compiles". The bugs this caught are listed in sections 3-7 above.

## Prompts

### 1. Analysis first
> *[the full assessment brief, pasted]* ... **analysis this first**

*Outcome:* an analysis of what the assessment rewards (framing, scale awareness, tests, commit history, deployment), a proposed scope and stack, and questions for me. Led to commit `df1cfe0` (requirements doc + this log).

### 2. Choosing the stack
> for backend user Django REST framework and for frontend use React with Vite and for deployment use whatever is free and for testing you can use Pyrite or Playwright.

*Outcome:* Django REST Framework + React/Vite, pytest for the backend, Playwright for end-to-end. ("Pyrite" was taken to mean pytest.) Requirements doc written and committed.

### 3. Repo (I interrupted the AI's plan to build straight away)
> yes
>
> *[Request interrupted by user]*
>
> first crrate the repo

*Outcome:* public GitHub repo `salary-management` created and pushed first, so every later step is visible in the history.

### 4. Backend
> now proceed with the backedn

*Outcome:* four vertical slices, each with tests and its own commit: `84ecbe6` models, `641f217` seed script, `b09c6ef` employee API, `4465e9b` insights API + performance notes.

### 5. Frontend
> yes

*(In answer to "Want me to start on the frontend?")*

*Outcome:* three slices: `5a95d9e` app shell and employee table, `c824d9c` add/edit/delete + salary history + Playwright, `a020ec8` insights dashboard.

### 6. UI quality and login (I interrupted and restated it more clearly)
> UI designing is massive. So build a good UI and uh, also add one login logout page.
>
> *[Request interrupted by user]*
>
> UI designing is not good. Build a good UI, eye-catching UI design, and also add login logout page for the user to log in.

*Outcome:* `d37f552` token authentication (login/logout/me, rate-limited) and `15f7dd4` full redesign: themed layout, gradient sidebar, hero and KPI cards, dark mode, responsive.

### 7. Run it
> run the project locally

*Outcome:* servers started and verified (API 401 without a token, login works, UI loads). Asked again later, prompt 11.

### 8. Background
> Uh, I don't like the background screen. Can you please make it a little animated and attractive to view?

*Outcome:* `53245cd` animated aurora background for the login page and a soft wash inside the app, with reduced-motion support.

### 9. More animation
> Can you make a little more animation in the background screen?

*Outcome:* added a rotating light beam, floating shapes, rings, stars, streaks and mouse parallax. **I rejected the commit for this round after seeing it** (next prompt), so it was never committed in that form.

### 10. Redirecting after seeing the result
> remove that square and circle make it more animated look make it look good

*Outcome:* shapes and rings removed; replaced with swaying aurora curtains, rolling waves and streaming light lines. Committed as `cb7e4a2`. (The AI introduced and then caught a CSS regression that would have broken reduced-motion; see section 6.)

### 11. Run it again
> run the project locally

### 12. Adjustable sidebar
> Can you make the nav bar uh, adjustable?

*Outcome:* `c4c6544` sidebar that collapses to an icon rail, resizes by dragging, and is keyboard-accessible; width remembered.

### 13. README (with a screenshot of the GitHub repo page attached)
> Add readme file for the git repo.

*Outcome:* `c739c6d` README with screenshots, architecture diagram, setup and API docs; `f4c6dce` cleanup of IDE files that my screenshot showed were committed by accident; `f4e270c` corrected two inaccuracies the AI found in its own README (a stray "Redis" mention and an out-of-date latency claim).

### 14. Completeness check against the brief
> *[the assessment brief pasted again]* As per the document, do, have, do you have completed all the requirements do you have completed all the requirements? All the requirements. Requirements.

*Outcome:* an honest audit: what is done, what is missing (deployment, demo video, sending the link), and what was only partly done (this appendix).

### 15. This appendix
> Partly done
> * Prompts used with AI tools. docs/ai-log.md summarizes the prompts and what I steered or corrected. It doesn't contain the prompts word for word. I can add the actual prompts as a short appendix if you want them. complete this

*Outcome:* this appendix.
