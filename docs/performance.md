# Performance notes

## Live deployment (Render free tier)
Measured against https://acme-salary.onrender.com from the author's location, best of 5, with gzip enabled as browsers send it. A bare `GET /api/health/` (no database work) takes **353 ms**, so that is the network floor; "beyond baseline" is the server's share.

| Endpoint | Total | Beyond baseline | Bytes on the wire |
|---|---|---|---|
| `employees/?page_size=25` | 345 ms | ~0 ms | 1.2 kB |
| `insights/payroll/?group_by=country` | 349 ms | ~0 ms | 0.3 kB |
| `insights/outliers/` | 575 ms | ~220 ms | 2.3 kB |
| `insights/gender-gap/?group_by=department` | 702 ms | ~350 ms | 0.3 kB |
| `employees/export/` (10,000 rows) | 2133 ms | ~1.8 s | 220 kB (1.06 MB uncompressed) |

**What this shows**
- SQL-backed endpoints are effectively free next to the network round trip.
- The endpoints that compute statistics in Python (outliers, gender gap) and the full CSV export take 0.2-1.8 s of server time on the free tier's throttled CPU, about 10x their laptop timings (25-79 ms, tables below).
- **Gzip helped bytes, not time:** the export shrank about 5x (1.06 MB to 220 kB) but only dropped from 2381 ms to 2133 ms, so the remaining time is CPU. I measured before and after instead of assuming it would help.
- Against the 500 ms target in the requirements: the interactive endpoints meet it; the two Python insights and the export exceed it on this hosting tier, while meeting it locally.

**What I would do next, in order:** (1) cache insight results per filter set, invalidated on any write, since they only change when data changes; (2) move to PostgreSQL and compute percentiles in SQL with `percentile_cont`; (3) a paid instance with a real CPU share. The dashboard fires the heavy calls in parallel and shows the light ones first, so it stays usable meanwhile.

**Cold start:** the free instance sleeps after ~15 minutes idle. Render states a delay of "50 seconds or more" for the first request, then the container boots (migrate, seed 10,000 employees, start) in about 5 seconds. I did not force a cold start to time it, so I am quoting Render's figure and not my own.


## Update: re-measured after adding authentication
Over real HTTP with a token (best of 3, Django dev server, 10,000 employees). The first table below was measured earlier, in-process, before auth existed. These are the more representative numbers:

| Endpoint | Time |
|---|---|
| `GET /api/employees/?page_size=25` | 6 ms |
| Filtered + sorted list | 6 ms |
| Search by name | 9 ms |
| CSV export (all 10k rows) | 79 ms |
| `insights/summary` | 7 ms |
| `insights/payroll` | 6 ms |
| `insights/percentiles` | 16 ms |
| `insights/outliers` | 29 ms |
| `insights/gender-gap` | 38 ms |

Authentication (one indexed token lookup per request) is not measurable next to these costs. The CSV export is the slowest because it serialises 10,000 rows, and it is streamed so memory stays flat.

## Original measurements (in-process, before auth)

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
