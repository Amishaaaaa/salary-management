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
