# Performance notes

Measured locally (SQLite, 10,000 employees, Django test client, single request, warm):

| Endpoint | Time |
|---|---|
| `GET /api/employees/?page_size=25` | 29 ms (first hit, includes COUNT) |
| Filtered + sorted list | 4 ms |
| Search by name | 6 ms |
| CSV export (all 10k rows) | 53 ms |
| `insights/summary`, `insights/payroll` | 4-5 ms |
| `insights/percentiles` | 11 ms |
| `insights/outliers` | 25 ms |
| `insights/gender-gap` | 39 ms |

## Decisions behind these numbers
- **Server-side pagination** with a capped `page_size` (max 100); the browser never receives 10k rows.
- **Indexes** on country, department, level, job_title and salary_usd, the columns HR filters and sorts by.
- **USD-normalised salary stored at write time** (`salary_usd`) so cross-country sort, filter and SUM/AVG stay in SQL. Trade-off: changing an FX rate requires re-deriving the column (a one-line management command). Rates are static by design, see the requirements doc.
- **Percentiles, outliers and gender gap are computed in Python** over one narrow query. SQLite has no percentile function, and at 10k rows this takes tens of milliseconds. Above roughly 500k rows I would move to PostgreSQL (`percentile_cont`) or pre-aggregate.
- **CSV export streams** using `.iterator()` so memory stays flat as the org grows.
- **Gender gap uses a pay index**, not raw medians: salary divided by the median of the person's (country, department, level) peers. Raw medians would show a large fake gap caused purely by role mix.
