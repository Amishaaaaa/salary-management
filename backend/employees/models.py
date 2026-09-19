from django.db import models

from . import constants


def _choices(values):
    return [(v, v) for v in values]


class Employee(models.Model):
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    email = models.EmailField(unique=True)
    job_title = models.CharField(max_length=120, db_index=True)
    department = models.CharField(max_length=40, choices=_choices(constants.DEPARTMENTS), db_index=True)
    level = models.CharField(max_length=4, choices=_choices(constants.LEVELS), db_index=True)
    gender = models.CharField(max_length=1, choices=_choices(constants.GENDERS))
    country = models.CharField(max_length=2, choices=_choices(constants.COUNTRY_CURRENCY), db_index=True)
    hire_date = models.DateField()

    # Current annual base salary in whole units of the country's currency.
    salary = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, editable=False)
    # Denormalised at write time so cross-country aggregation/sorting/filtering stays in the DB.
    salary_usd = models.PositiveIntegerField(editable=False, db_index=True)

    class Meta:
        ordering = ["last_name", "first_name", "id"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    def derive_fields(self):
        """Set currency and USD-normalised salary. Also used by bulk seeding, which bypasses save()."""
        self.currency = constants.COUNTRY_CURRENCY[self.country]
        self.salary_usd = constants.to_usd(self.salary, self.currency)

    def save(self, *args, **kwargs):
        self.derive_fields()
        super().save(*args, **kwargs)


class SalaryRecord(models.Model):
    """Append-only history: one row per salary set (initial hire or a change)."""

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="salary_history")
    amount = models.PositiveIntegerField()
    currency = models.CharField(max_length=3)
    effective_date = models.DateField()
    reason = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-effective_date", "-id"]
