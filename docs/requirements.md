# Requirements: Salary Management for ACME

## Goal
Replace the Excel sheets HR uses to manage salaries for ~10,000 employees in multiple countries with a web app. The HR Manager should be able to maintain salary data and **answer questions about how the org pays people** without building pivot tables by hand.

## User
One persona: the HR Manager. They are not technical, work with sensitive data, and need answers quickly (for example in a compensation review meeting).

## Questions the software must answer
1. How much do we spend on payroll, by country and department?
2. What is the typical (median / P25 / P75) salary for a job title or level, in a given country?
3. Who is paid far above or below the median for their role (outliers)?
4. Is there a pay gap between genders for the same role and level?
5. What is one specific person's salary, and how has it changed over time?

## Scope (in)
| Feature | Why |
|---|---|
| Employee list with search, filter (country, department, level), sort, server-side pagination | 10k rows can't be loaded into the browser; this replaces "Ctrl+F in Excel" |
| Create / edit / delete an employee, with validation | Replaces manual spreadsheet edits, which cause typos and inconsistent data |
| Salary history: a raise adds a record, and the old value is kept | Excel overwrites values; HR needs to see how pay changed |
| Insights dashboard: payroll by country/department, salary percentiles by job title, outliers, gender pay gap | The "answer questions" part of the goal |
| Multi-currency with a single reporting currency (USD) | Comparing across countries is meaningless without normalization |
| CSV export of the current filtered view | HR still shares data with finance in spreadsheets |
| Deterministic seed script for 10,000 employees | Reproducible demo and tests |

## Deliberately left out
| Left out | Reasoning |
|---|---|
| Payroll processing, tax, benefits, equity | A different product. This tool analyses base salary and does not pay anyone. |
| Live FX rates | Static, documented rates keep results deterministic and testable. Live rates would make the same report show different numbers each day. |
| Roles/permissions and SSO | There is one persona. A single login is enough for the demo. A real rollout needs RBAC and audit logging because this is sensitive data, and it is listed as the first follow-up. |
| Excel import | Would be useful for migration, but the seed covers the demo. It is the next feature to build. |
| Approval workflows, performance reviews, salary bands | Valuable, but they widen the scope beyond "manage salaries and answer questions". |
| Mobile-first design, native app | An HR manager works at a desk, so the UI is designed desktop-first. It is responsive and usable on a phone, but that is a bonus, not a goal. |

## Key decisions
- **Money is stored as whole-unit integers (annual base salary) plus a currency code derived from the country**, never floats. A USD-normalised copy is stored at write time so cross-country aggregation stays in the database.
- **Aggregation happens in the database or in a service layer**, not in the browser. The API returns results, not 10k rows.
- **Stack:** Django REST Framework + SQLite, React (Vite), pytest for backend tests, Playwright for end-to-end checks. All are free to deploy.

## Success criteria
- Every question above can be answered in under 3 clicks.
- List and dashboard endpoints respond in under 500 ms on the 10k dataset locally.
- Unit tests cover validation, aggregation and seed determinism, and run in seconds.
