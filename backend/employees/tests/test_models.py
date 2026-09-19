import pytest

from employees import constants
from employees.tests.factories import make_employee


def test_to_usd_uses_static_rate():
    assert constants.to_usd(100_000, "GBP") == 127_000


def test_to_usd_usd_is_identity():
    assert constants.to_usd(85_000, "USD") == 85_000


def test_every_country_currency_has_a_rate():
    assert set(constants.COUNTRY_CURRENCY.values()) <= set(constants.USD_PER_UNIT)


@pytest.mark.django_db
def test_save_derives_currency_and_usd_from_country():
    emp = make_employee(country="IN", salary=2_500_000)
    assert emp.currency == "INR"
    assert emp.salary_usd == 30_000


@pytest.mark.django_db
def test_changing_country_recomputes_currency_and_usd():
    emp = make_employee(country="US", salary=100_000)
    emp.country = "GB"
    emp.save()
    emp.refresh_from_db()
    assert (emp.currency, emp.salary_usd) == ("GBP", 127_000)
