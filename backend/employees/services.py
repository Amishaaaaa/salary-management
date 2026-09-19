"""Write-side business rules. Views/serializers stay thin; history is recorded here."""
from datetime import date

from django.db import transaction

from .models import Employee, SalaryRecord


def _record(employee: Employee, effective_date: date, reason: str):
    SalaryRecord.objects.create(
        employee=employee,
        amount=employee.salary,
        currency=employee.currency,
        effective_date=effective_date,
        reason=reason,
    )


@transaction.atomic
def create_employee(data: dict) -> Employee:
    employee = Employee.objects.create(**data)
    _record(employee, employee.hire_date, "Hire")
    return employee


@transaction.atomic
def update_employee(employee: Employee, data: dict, *, effective_date: date | None = None, reason: str = "") -> Employee:
    """Apply changes; append a history row only if salary or country (currency) changed."""
    old = (employee.salary, employee.currency)
    for field, value in data.items():
        setattr(employee, field, value)
    employee.save()
    if (employee.salary, employee.currency) != old:
        _record(employee, effective_date or date.today(), reason or "Salary change")
    return employee
