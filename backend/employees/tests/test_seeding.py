import pytest

from employees import constants
from employees.models import Employee, SalaryRecord
from employees.seeding import generate


def _key(emp):
    return (emp.email, emp.country, emp.level, emp.salary, emp.hire_date)


def test_same_seed_gives_identical_output():
    a, _ = generate(200, seed=7)
    b, _ = generate(200, seed=7)
    assert [_key(e) for e in a] == [_key(e) for e in b]


def test_different_seed_gives_different_output():
    a, _ = generate(200, seed=1)
    b, _ = generate(200, seed=2)
    assert [_key(e) for e in a] != [_key(e) for e in b]


def test_emails_are_unique_and_count_is_exact():
    emps, _ = generate(500, seed=3)
    assert len(emps) == 500
    assert len({e.email for e in emps}) == 500


def test_generated_values_are_valid():
    emps, _ = generate(300, seed=4)
    for e in emps:
        assert e.department in constants.DEPARTMENTS
        assert e.level in constants.LEVELS
        assert e.currency == constants.COUNTRY_CURRENCY[e.country]
        assert e.salary > 0 and e.salary_usd > 0


def test_history_ends_at_current_salary_and_starts_with_hire():
    emps, records = generate(300, seed=5)
    by_emp = {}
    for r in records:
        by_emp.setdefault(r.employee_id, []).append(r)
    for e in emps:
        recs = sorted(by_emp[e.id], key=lambda r: r.effective_date)
        assert 1 <= len(recs) <= 3
        assert recs[0].reason == "Hire" and recs[0].effective_date == e.hire_date
        assert recs[-1].amount == e.salary or len(recs) == 1 and recs[0].amount == e.salary
        assert [r.amount for r in recs] == sorted(r.amount for r in recs)


@pytest.mark.django_db
def test_seed_command_is_idempotent():
    from django.core.management import call_command

    call_command("seed_employees", count=50, seed=1)
    call_command("seed_employees", count=50, seed=1)
    assert Employee.objects.count() == 50
    assert SalaryRecord.objects.filter(employee__isnull=False).count() >= 50
