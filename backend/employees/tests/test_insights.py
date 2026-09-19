import pytest
from rest_framework.test import APIClient

from employees import insights
from employees.tests.factories import make_employee


def row(salary, **kw):
    base = dict(job_title="Eng", level="L3", country="US", department="Engineering", gender="M", salary_usd=salary)
    base.update(kw)
    return base


class TestPercentile:
    def test_single_value(self):
        assert insights.percentile([7], 50) == 7

    def test_median_of_even_count_interpolates(self):
        assert insights.percentile([10, 20, 30, 40], 50) == 25

    def test_quartiles(self):
        values = [10, 20, 30, 40, 50]
        assert (insights.percentile(values, 25), insights.percentile(values, 75)) == (20, 40)


def test_summarize():
    s = insights.summarize([30, 10, 20])
    assert s == {"count": 3, "min": 10, "p25": 15, "median": 20, "p75": 25, "max": 30, "mean": 20}


def test_percentiles_by_group_sorted_by_median_desc():
    rows = [row(100, job_title="A"), row(200, job_title="B"), row(300, job_title="B")]
    result = insights.percentiles_by(rows, "job_title")
    assert [g["group"] for g in result] == ["B", "A"]


class TestOutliers:
    peers = [row(100_000) for _ in range(5)]

    def test_flags_high_and_low_relative_to_peers(self):
        rows = self.peers + [row(200_000), row(40_000)]
        found = insights.find_outliers(rows, threshold=0.4)
        assert sorted(o["deviation_pct"] for o in found) == [-60.0, 100.0]

    def test_ignores_groups_too_small_to_compare(self):
        assert insights.find_outliers([row(100_000), row(500_000)], min_group=5) == []

    def test_compares_like_for_like_country(self):
        india = [row(20_000, country="IN") for _ in range(5)]
        assert insights.find_outliers(self.peers + india) == []  # cheap-country pay is not an "outlier"

    def test_sorted_by_severity_and_limited(self):
        rows = self.peers + [row(150_000), row(300_000)]
        found = insights.find_outliers(rows, threshold=0.2, limit=1)
        assert [o["deviation_pct"] for o in found] == [200.0]


class TestGenderGap:
    def cell(self, f_pay, m_pay, n=5, **kw):
        return [row(f_pay, gender="F", **kw) for _ in range(n)] + [row(m_pay, gender="M", **kw) for _ in range(n)]

    def test_equal_pay_is_zero_gap(self):
        assert insights.gender_gap(self.cell(100, 100))[0]["gap_pct"] == 0

    def test_positive_when_men_paid_more(self):
        result = insights.gender_gap(self.cell(90, 100))
        assert result[0]["gap_pct"] > 0 and result[0]["female_index"] < result[0]["male_index"]

    def test_role_mix_does_not_create_a_fake_gap(self):
        # Women sit only in a high-paid level and men only in a low-paid one, but each is paid the cell median.
        rows = ([row(200, gender="F", level="L5") for _ in range(5)] + [row(50, gender="M", level="L1") for _ in range(5)]
                + [row(200, gender="M", level="L5") for _ in range(5)] + [row(50, gender="F", level="L1") for _ in range(5)])
        assert insights.gender_gap(rows)[0]["gap_pct"] == 0

    def test_skips_groups_without_enough_of_each_gender(self):
        assert insights.gender_gap(self.cell(90, 100, n=2)) == []


@pytest.mark.django_db
class TestInsightApi:
    @pytest.fixture
    def client(self):
        for i, (country, salary) in enumerate([("US", 100_000), ("US", 200_000), ("IN", 2_500_000)]):
            make_employee(email=f"e{i}@x.test", country=country, salary=salary)
        return APIClient()

    def test_summary(self, client):
        data = client.get("/api/insights/summary/").data
        assert data["headcount"] == 3 and data["total_payroll_usd"] == 100_000 + 200_000 + 30_000

    def test_summary_on_empty_filter_does_not_crash(self, client):
        assert client.get("/api/insights/summary/?country=JP").data["headcount"] == 0

    def test_payroll_grouped_by_country(self, client):
        data = client.get("/api/insights/payroll/?group_by=country").data
        assert data[0] == {"group": "US", "headcount": 2, "total_usd": 300_000, "avg_usd": 150_000}

    def test_filters_apply_to_insights(self, client):
        data = client.get("/api/insights/payroll/?group_by=country&country=IN").data
        assert [d["group"] for d in data] == ["IN"]

    def test_invalid_group_by_is_a_400(self, client):
        assert client.get("/api/insights/payroll/?group_by=salary").status_code == 400

    def test_invalid_threshold_is_a_400(self, client):
        assert client.get("/api/insights/outliers/?threshold=abc").status_code == 400

    def test_percentiles_endpoint(self, client):
        data = client.get("/api/insights/percentiles/?group_by=country").data
        assert {d["group"]: d["median"] for d in data} == {"US": 150_000, "IN": 30_000}
