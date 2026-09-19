from datetime import date

from employees.models import Employee


def make_employee(**overrides):
    data = dict(
        first_name="Ada",
        last_name="Lovelace",
        email="ada@acme.test",
        job_title="Software Engineer",
        department="Engineering",
        level="L3",
        gender="F",
        country="US",
        hire_date=date(2020, 1, 15),
        salary=100_000,
    )
    data.update(overrides)
    return Employee.objects.create(**data)
