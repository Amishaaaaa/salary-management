import pytest
from rest_framework.test import APIClient

from employees.models import Employee
from employees.tests.factories import authed_client, make_employee

URL = "/api/employees/"


@pytest.fixture
def client():
    return authed_client()


def payload(**overrides):
    data = dict(first_name="Grace", last_name="Hopper", email="grace@acme.test", job_title="Software Engineer",
                department="Engineering", level="L4", gender="F", country="GB",
                hire_date="2021-03-01", salary=90_000)
    data.update(overrides)
    return data


@pytest.mark.django_db
class TestCreate:
    def test_create_derives_currency_and_writes_hire_history(self, client):
        res = client.post(URL, payload(), format="json")
        assert res.status_code == 201
        assert res.data["currency"] == "GBP" and res.data["salary_usd"] == 114_300
        history = client.get(f"{URL}{res.data['id']}/salary-history/").data
        assert [(h["amount"], h["reason"]) for h in history] == [(90_000, "Hire")]

    @pytest.mark.parametrize("bad", [
        {"salary": 0}, {"salary": -5}, {"salary": 999_999_999},
        {"hire_date": "2999-01-01"}, {"country": "ZZ"}, {"level": "L9"}, {"email": "nope"},
    ])
    def test_rejects_invalid_input(self, client, bad):
        assert client.post(URL, payload(**bad), format="json").status_code == 400

    def test_rejects_duplicate_email(self, client):
        make_employee(email="grace@acme.test")
        assert client.post(URL, payload(), format="json").status_code == 400


@pytest.mark.django_db
class TestUpdate:
    def test_salary_change_appends_history_and_keeps_old_record(self, client):
        emp = make_employee(salary=100_000)
        res = client.patch(f"{URL}{emp.id}/", {"salary": 110_000, "change_reason": "Promotion",
                                               "effective_date": "2025-06-01"}, format="json")
        assert res.status_code == 200 and res.data["salary"] == 110_000
        emp.refresh_from_db()
        assert emp.salary_usd == 110_000
        assert [(r.amount, r.reason) for r in emp.salary_history.all()] == [(110_000, "Promotion")]

    def test_non_salary_edit_does_not_add_history(self, client):
        emp = make_employee()
        client.patch(f"{URL}{emp.id}/", {"job_title": "Staff Engineer"}, format="json")
        assert emp.salary_history.count() == 0

    def test_moving_country_records_currency_change(self, client):
        emp = make_employee(country="US", salary=100_000)
        client.patch(f"{URL}{emp.id}/", {"country": "GB"}, format="json")
        emp.refresh_from_db()
        assert emp.currency == "GBP" and emp.salary_history.count() == 1

    def test_delete(self, client):
        emp = make_employee()
        assert client.delete(f"{URL}{emp.id}/").status_code == 204
        assert Employee.objects.count() == 0


@pytest.mark.django_db
class TestListing:
    @pytest.fixture(autouse=True)
    def people(self):
        make_employee(email="a@x.test", first_name="Ann", last_name="Adams", country="US", department="Sales", salary=50_000)
        make_employee(email="b@x.test", first_name="Bob", last_name="Baker", country="US", department="Engineering", salary=150_000)
        make_employee(email="c@x.test", first_name="Cy", last_name="Cole", country="IN", department="Engineering", salary=2_000_000)

    def names(self, client, query=""):
        return [e["first_name"] for e in client.get(f"{URL}?{query}").data["results"]]

    def test_default_order_is_by_last_name(self, client):
        assert self.names(client) == ["Ann", "Bob", "Cy"]

    def test_filters_combine(self, client):
        assert self.names(client, "country=US&department=Engineering") == ["Bob"]

    def test_salary_range_uses_usd_normalised_value(self, client):
        # Cy earns 2,000,000 INR = 24,000 USD, so he is below 30k despite the big local number.
        assert self.names(client, "max_salary_usd=30000") == ["Cy"]

    def test_search_matches_name(self, client):
        assert self.names(client, "search=baker") == ["Bob"]

    def test_ordering_by_salary_desc(self, client):
        assert self.names(client, "ordering=-salary_usd") == ["Bob", "Ann", "Cy"]

    def test_pagination_reports_total_and_respects_page_size(self, client):
        data = client.get(f"{URL}?page_size=2").data
        assert data["count"] == 3 and len(data["results"]) == 2 and data["next"]

    def test_page_size_is_capped(self, client):
        for i in range(105):
            make_employee(email=f"z{i}@x.test")
        assert len(client.get(f"{URL}?page_size=1000").data["results"]) == 100


@pytest.mark.django_db
class TestExportAndMeta:
    def test_export_respects_filters_and_has_header(self, client):
        make_employee(email="a@x.test", country="US")
        make_employee(email="b@x.test", country="IN")
        res = client.get(f"{URL}export/?country=IN")
        lines = res.content.decode().strip().splitlines()
        assert res["Content-Type"] == "text/csv"
        assert lines[0].startswith("id,first_name") and len(lines) == 2 and "b@x.test" in lines[1]

    def test_meta_lists_options(self, client):
        make_employee(job_title="Recruiter")
        data = client.get("/api/meta/").data
        assert "Recruiter" in data["job_titles"] and "Engineering" in data["departments"]
        assert {"code": "US", "currency": "USD"} in data["countries"]
