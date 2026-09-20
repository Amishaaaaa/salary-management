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

## 8. Whole-repo self-review (playbook prompt #6, run for real)
**Prompt:** playbook prompt #6, *"Before committing, review your own diff for bugs, leftovers and claims in the docs that are not backed by a measurement. List anything you are unsure about instead of hiding it."* I approved running it on the whole repository before deployment (Appendix A, prompt 17).

**Method:** read-only checks first (tracked files, the linter I had never run, Django's deployment checker), then **reproduce each suspected bug before fixing it**, fix it in its own commit with tests, and re-run the full stack.

| # | Finding | Evidence | Fix | Commit |
|---|---|---|---|---|
| 1 | Playwright output file tracked in git; Vite template README left in `frontend/`; no favicon | `git ls-files`, file contents | untracked + ignored, real README, favicon | `aa9e593` |
| 2 | Outlier `limit` / `threshold` accepted nonsense | reproduced: `limit=-1` returned 74 rows (negative slice), `threshold=-1` flagged everyone, `threshold=nan` silently returned nothing | validated to a clear 400 (finite, positive) | `bc93625`, 10 tests (6 failed before the fix) |
| 3 | `seed_employees` deleted all data unconditionally | read the command; would wipe real data if run on a live DB | refuses on a non-empty DB unless `--reset`; `--if-empty` for deploy scripts; verified against the real 10,000-row DB | `604253c`, 5 tests |
| 4 | Unsafe production defaults: `DEBUG` on by default, insecure fallback secret key, any host, any CORS origin | `check --deploy` (4 warnings) and reading settings | secure by default: debug off, secret key required, host/CORS allowlists, HTTPS + HSTS; `check --deploy` 4 to 2 warnings, the remaining 2 deliberate | `ab877b8`, 4 tests |
| 5 | 4 lint warnings; **bug:** a brief network error on page load signed the user out | `npm run lint`; reading `AuthContext` | hooks split from components (0 warnings); only a rejected token ends the session | `b76fd1b`, 4 tests |
| 6 | Docs out of date: requirements said mobile was "left out" though a phone layout shipped; README test counts and config table stale; limitations incomplete | grep against the code | corrected; added limitations (tokens never expire, per-process throttle, admin enabled) | this commit |

**Test-quality check:** for finding 5 I re-introduced the buggy line and confirmed the new test fails (`expected null to be 'abc'`), then restored the fix. A test that cannot fail proves nothing.

**Result:** backend tests 70 to 88, frontend unit tests 20 to 24, e2e 14 (re-run on a restarted server to prove the new settings work end to end), lint clean.

**Deliberately not changed (flagged instead):** token expiry, a shared rate-limit cache, disabling `/admin/`, HSTS subdomains/preload. Each is listed under "Known limitations" in the README with the reason.

---

# Appendix A: The prompts used

The instructions I gave the AI in this project, in order. They were typed and dictated quickly, so they are **edited here for spelling, grammar and clarity**. Each one keeps its original request and scope; nothing has been added that I did not ask for. Each prompt is mapped to the commits it produced, so the history can be read alongside it.

The AI tool was **Claude Code** (an agentic CLI: it reads files, runs commands and tests, and edits code in my repo). The assessment brief was pasted in full in prompts 1 and 14; it is not reproduced here.

## How I worked with it
- **Short, conversational prompts, then review.** I gave direction and constraints; the AI proposed and built; I reviewed the running result and redirected.
- **Analysis and requirements before code.** Nothing was built until the scope was written down.
- **I interrupted and redirected several times** (prompts 3 and 6, and a commit I rejected after prompt 9). The AI was not left to run unattended.
- **Verification was part of every step**: tests, real-browser checks and screenshots, not just "it compiles". The bugs this caught are listed in sections 3-7 above.

## Prompts

### 1. Analysis first
> *[The full assessment brief, pasted.]* Please analyse this first, before we build anything.

*Outcome:* an analysis of what the assessment rewards (framing, scale awareness, tests, commit history, deployment), a proposed scope and stack, and questions for me. Led to commit `df1cfe0` (requirements doc and this log).

### 2. Choosing the stack
> Use Django REST Framework for the backend and React with Vite for the frontend. For deployment, use whatever is free. For testing, you can use pytest or Playwright.

*Outcome:* Django REST Framework, React with Vite, pytest for the backend and Playwright for end-to-end tests. Requirements doc written and committed.

### 3. Create the repo first *(I interrupted the AI's plan to build straight away)*
> Yes. *[interrupted]* First, create the repository.

*Outcome:* a public GitHub repo, `salary-management`, created and pushed first, so every later step is visible in the history.

### 4. Backend
> Now proceed with the backend.

*Outcome:* four vertical slices, each with tests and its own commit: `84ecbe6` models, `641f217` seed script, `b09c6ef` employee API, `4465e9b` insights API and performance notes.

### 5. Frontend
> Yes. *(In answer to "Shall I start on the frontend?")*

*Outcome:* three slices: `5a95d9e` app shell and employee table, `c824d9c` add/edit/delete, salary history and Playwright tests, `a020ec8` insights dashboard.

### 6. UI quality and login *(I interrupted and restated it more clearly)*
> The UI design is not good. Build a good UI, and also add a login/logout page. *[interrupted]*
>
> The UI design is not good. Build an eye-catching UI, and add a login/logout page so the user can sign in.

*Outcome:* `d37f552` token authentication (login, logout, current user; rate-limited login) and `15f7dd4` full redesign: themed layout, gradient sidebar, hero and KPI cards, dark mode, responsive.

### 7. Run it
> Run the project locally.

*Outcome:* servers started and verified (API returns 401 without a token, login works, UI loads). Asked again in prompt 11.

### 8. Background
> I don't like the background screen. Can you make it a little animated and more attractive to look at?

*Outcome:* `53245cd` animated aurora background on the login page and a soft colour wash inside the app, with reduced-motion support.

### 9. More animation
> Can you add a bit more animation to the background screen?

*Outcome:* added a rotating light beam, floating shapes, rings, stars, streaks and mouse parallax. **I rejected the commit for this round after seeing it** (next prompt), so it was never committed in that form.

### 10. Redirecting after seeing the result
> Remove the squares and circles, make the background more animated, and make it look good.

*Outcome:* shapes and rings removed; replaced with swaying aurora curtains, rolling waves and streaming light lines. Committed as `cb7e4a2`. (The AI introduced and then caught a CSS regression that would have broken reduced-motion; see section 6.)

### 11. Run it again
> Run the project locally.

### 12. Adjustable sidebar
> Can you make the navigation bar adjustable?

*Outcome:* `c4c6544` sidebar that collapses to an icon rail, resizes by dragging, works from the keyboard, and remembers its width.

### 13. README *(a screenshot of the GitHub repo page was attached)*
> Add a README file to the Git repository.

*Outcome:* `c739c6d` README with screenshots, architecture diagram, setup and API docs. `f4c6dce` removed IDE files that the screenshot showed had been committed by accident. `f4e270c` corrected two inaccuracies the AI found in its own README (a stray "Redis" mention and an out-of-date latency claim).

### 14. Completeness check against the brief
> *[The assessment brief, pasted again.]* Going by this document, have you completed all the requirements?

*Outcome:* an honest audit: what is done, what is missing (deployment, demo video, sending the link), and what was only partly done (the prompts appendix).

### 15. Prompts appendix
> Prompts used with AI tools: the AI log summarizes the prompts and what I steered or corrected, but does not include the prompts themselves. Please add them as a short appendix. Complete this.

*Outcome:* the first version of this appendix, commit `3e8c8ff`.

### 16. Improve the wording
> Fix the English in the prompts. For an assessment, give the best version of the prompts we used rather than the exact typed text.

*Outcome:* this rewrite. It is edited for clarity only, and the playbook below is kept separate and labelled so the record stays accurate.

### 17. Whole-repo review (a playbook prompt, used for real)
> *(I asked whether to run playbook prompt #6 on the repository, and answered:)* Yes.
>
> The prompt itself, from Appendix B: "Before committing, review your own diff for bugs, leftovers and claims in the docs that are not backed by a measurement. List anything you are unsure about instead of hiding it."

*Outcome:* section 8 above: 6 findings, 5 fixed with tests, 4 items deliberately flagged instead. The wording of this prompt was proposed by the AI and adopted by me by approving it.

---

# Appendix B: Prompt playbook (how I would phrase these next time)

**These are recommended prompts, not (except where noted) the ones used above.** Prompt #6 was used for real, see Appendix A, prompt 17. They capture what I learned about getting better results from an agentic AI tool, and they show the habits I would apply on a real project.

1. **Requirements first, with room to push back**
   > Act as a product manager for an HR Manager persona. Write a one-page requirements document: goal, scope, features, what is deliberately left out and why, and success criteria. Ask me up to three clarifying questions before writing.

2. **Build in vertical slices**
   > Build the next feature as one vertical slice: model, service layer, API, then tests. Keep business logic out of views, keep statistics in pure functions I can test without a database, and make one commit per slice.

3. **Tests that are fast and readable**
   > Write unit tests that are fast, deterministic and easy to read. Use fixed seeds and dates, no network, and one behaviour per test. Include edge cases: empty input, invalid input and permissions.

4. **Verify with evidence, not assertions**
   > After each change, run the tests and check the result in a real browser. Report measurements (timings, rendered values, console errors), not "it should work". If something looks off, find the cause before fixing it.

5. **Design system, not one-off styling**
   > Define theme tokens for colour, spacing and type, with light and dark modes. Check screenshots at desktop and phone widths, keep text contrast readable, respect reduced-motion, and make every interactive control keyboard-accessible.

6. **Review your own diff before committing**
   > Before committing, review your own diff for bugs, leftovers and claims in the docs that are not backed by a measurement. List anything you are unsure about instead of hiding it.
