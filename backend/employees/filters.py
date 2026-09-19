import django_filters

from .models import Employee


class EmployeeFilter(django_filters.FilterSet):
    min_salary_usd = django_filters.NumberFilter(field_name="salary_usd", lookup_expr="gte")
    max_salary_usd = django_filters.NumberFilter(field_name="salary_usd", lookup_expr="lte")

    class Meta:
        model = Employee
        fields = ["country", "department", "level", "gender", "job_title"]
