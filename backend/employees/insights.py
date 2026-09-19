"""Pure statistics over plain dict rows (no DB access), so they are trivially unit-testable.

Every row needs: salary_usd, plus whichever grouping keys are used (country, department, level, job_title, gender).
"""
from collections import defaultdict
from statistics import mean, median

MIN_GROUP_SIZE = 5  # below this a median says more about one person than about a group


def percentile(sorted_values, p):
    """Linear-interpolated percentile (p in 0..100) of an already sorted, non-empty list."""
    if len(sorted_values) == 1:
        return float(sorted_values[0])
    rank = (len(sorted_values) - 1) * p / 100
    lo = int(rank)
    hi = min(lo + 1, len(sorted_values) - 1)
    return sorted_values[lo] + (sorted_values[hi] - sorted_values[lo]) * (rank - lo)


def summarize(values):
    ordered = sorted(values)
    return {
        "count": len(ordered),
        "min": ordered[0],
        "p25": round(percentile(ordered, 25)),
        "median": round(percentile(ordered, 50)),
        "p75": round(percentile(ordered, 75)),
        "max": ordered[-1],
        "mean": round(mean(ordered)),
    }


def _group(rows, keys):
    groups = defaultdict(list)
    for row in rows:
        groups[tuple(row[k] for k in keys)].append(row)
    return groups


def percentiles_by(rows, group_by):
    groups = _group(rows, [group_by])
    result = [{"group": key[0], **summarize([r["salary_usd"] for r in members])} for key, members in groups.items()]
    return sorted(result, key=lambda g: g["median"], reverse=True)


def find_outliers(rows, threshold=0.4, min_group=MIN_GROUP_SIZE, limit=50):
    """Flag people whose pay is > `threshold` (fraction) away from the median of their peers.

    Peers = same job title, level and country, so the comparison is like-for-like.
    """
    outliers = []
    for members in _group(rows, ["job_title", "level", "country"]).values():
        if len(members) < min_group:
            continue
        peer_median = median(r["salary_usd"] for r in members)
        for r in members:
            deviation = r["salary_usd"] / peer_median - 1
            if abs(deviation) > threshold:
                outliers.append({**r, "peer_median_usd": round(peer_median), "deviation_pct": round(deviation * 100, 1),
                                 "peer_count": len(members)})
    outliers.sort(key=lambda o: abs(o["deviation_pct"]), reverse=True)
    return outliers[:limit]


def gender_gap(rows, group_by="department", min_group=MIN_GROUP_SIZE):
    """Median pay index per gender, where index = salary / median of (country, department, level) peers.

    Using an index instead of raw pay removes the effect of *where* and *what level* people work,
    so the gap reflects unequal pay for comparable roles rather than a different mix of roles.
    Positive gap_pct means men are paid more than women.
    """
    index = {}
    for members in _group(rows, ["country", "department", "level"]).values():
        cell_median = median(r["salary_usd"] for r in members)
        for r in members:
            index[id(r)] = r["salary_usd"] / cell_median

    result = []
    for key, members in _group(rows, [group_by]).items():
        by_gender = {g: [index[id(r)] for r in members if r["gender"] == g] for g in ("F", "M")}
        if len(by_gender["F"]) < min_group or len(by_gender["M"]) < min_group:
            continue
        f, m = median(by_gender["F"]), median(by_gender["M"])
        result.append({"group": key[0], "female_count": len(by_gender["F"]), "male_count": len(by_gender["M"]),
                       "female_index": round(f, 3), "male_index": round(m, 3), "gap_pct": round((m - f) / m * 100, 1)})
    return sorted(result, key=lambda g: g["gap_pct"], reverse=True)
