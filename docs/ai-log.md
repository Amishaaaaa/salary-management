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

## 8. Whole-repo self-review
**Prompt:** *"Before committing, review your own diff for bugs, leftovers and claims in the docs that are not backed by a measurement. List anything you are unsure about instead of hiding it."* The AI proposed this wording and I approved running it on the whole repository before deployment.

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

## 9. Animated background inside the app
**Prompt:** "Add the animation in the background also after we login."

**Decisions:** reuse the same background component for the app instead of a second implementation, with the login screen at full strength and the app toned down so charts and tables stay readable. Two things needed adapting because the login background is dark: particles, streaks and curtains would be invisible on the pale light theme, so they take theme-aware colours (indigo on light, white on dark) and the curtains switch off the `screen` blend on light. Cards became slightly translucent (no backdrop blur, since the colour blobs are already soft, which keeps it cheap) so the motion shows through them and not only in the gaps between them.

**Verification:** measured every layer moving inside the app, 60 fps on the dashboard, particle colour and blend mode per theme, every animation resolving to `none` under reduced motion, then screenshots in both themes to check the data stays legible. README screenshots retaken to match.

## 10. Deployment
**Prompt:** "Yes, start the deployment."

**Decision (mine, revised from the plan):** the original plan was two hosts (API on Render, frontend on Vercel). I changed it to **one Docker image serving both**: Django serves the built React app through WhiteNoise. That removes CORS, cross-domain token handling and a second deploy to keep in sync, and it is the same artifact everywhere (my laptop, CI, Render).

**What was built:** a multi-stage `Dockerfile` (build the frontend, then a slim Python runtime running as a non-root user), an entrypoint that migrates, seeds only if the database is empty, creates the login and starts gunicorn, a `render.yaml` blueprint with a generated secret key and a health check, a public `/api/health/` endpoint, and a fallback route so deep links like `/insights` survive a browser refresh.

**Verified on the real image, not assumed:** booted it locally and checked plain HTTP redirects to HTTPS (except the health probe), a wrong Host header is rejected, the API needs a login, error pages leak nothing, the process is non-root, deep links work; then ran **all 14 Playwright tests against the container**. Two improvements came from measuring: the JavaScript bundle was served uncompressed (925 kB), so assets are now pre-compressed (281 kB over the wire), and hashed asset files are cached immutably while `index.html` is never cached so a new deploy always appears.

**Tests first for the new code:** 12 new backend tests (health check, routing, host handling, cache rule); 9 failed before the implementation. One test expectation was wrong (Django's admin redirects unknown URLs to its login rather than returning 404), and I corrected the test to assert the property that matters: those paths never fall through to the app.

**Honest limits, documented in the README:** the free tier sleeps after ~15 minutes idle and its disk is ephemeral, so live-demo edits reset on restart; the demo credentials are public by design because the data is synthetic.

**Live verification (after the user deployed via the Render Blueprint):** probed the public URL from outside (health, HTTPS redirect, deep links, locked API, login, 10,000 employees, compressed and cacheable bundle), then ran **all 14 Playwright tests against the live site** (passed). Timing the live API showed ~350 ms per request, and I separated the network floor (a bare health check) from server work instead of quoting raw totals. That exposed a real weakness: the Python-computed insights and the CSV export are slow on the free CPU. I tried the obvious fix (gzip API responses, test-first, 1 new test), measured it, and reported that it cut the export's bytes about 5x but its time only ~10%, so the remaining cost is CPU. I documented the honest numbers and the scaling path (caching, then PostgreSQL) instead of claiming a win.

