from django.db.models import Avg, Count, Sum
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from . import insights
from .filters import EmployeeFilter
from .models import Employee

GROUPS = {"country", "department", "level", "job_title"}
ROW_FIELDS = ["id", "first_name", "last_name", "job_title", "department", "level", "country", "gender",
              "salary", "currency", "salary_usd"]


def _filtered(request):
    """Every insight accepts the same filters as the employee list (country, department, ...)."""
    return EmployeeFilter(request.query_params, queryset=Employee.objects.all()).qs


def _group_param(request, default):
    group = request.query_params.get("group_by", default)
    if group not in GROUPS:
        raise ValidationError({"group_by": f"Must be one of {sorted(GROUPS)}."})
    return group


def _number(request, name, default, cast=float):
    try:
        return cast(request.query_params.get(name, default))
    except ValueError:
        raise ValidationError({name: "Must be a number."})


@api_view(["GET"])
def summary(request):
    rows = list(_filtered(request).order_by().values_list("salary_usd", flat=True))
    if not rows:
        return Response({"headcount": 0, "total_payroll_usd": 0, "mean_usd": 0, "median_usd": 0})
    stats = insights.summarize(rows)
    return Response({"headcount": stats["count"], "total_payroll_usd": sum(rows),
                     "mean_usd": stats["mean"], "median_usd": stats["median"]})


@api_view(["GET"])
def payroll(request):
    group = _group_param(request, "country")
    data = (_filtered(request).order_by().values(group)
            .annotate(headcount=Count("id"), total_usd=Sum("salary_usd"), avg_usd=Avg("salary_usd"))
            .order_by("-total_usd"))
    return Response([{"group": d[group], "headcount": d["headcount"], "total_usd": d["total_usd"],
                      "avg_usd": round(d["avg_usd"])} for d in data])


@api_view(["GET"])
def percentiles(request):
    group = _group_param(request, "job_title")
    rows = _filtered(request).order_by().values(group, "salary_usd")
    return Response(insights.percentiles_by(list(rows), group))


@api_view(["GET"])
def outliers(request):
    threshold = _number(request, "threshold", 0.4)
    limit = _number(request, "limit", 50, int)
    rows = list(_filtered(request).order_by().values(*ROW_FIELDS))
    return Response(insights.find_outliers(rows, threshold=threshold, limit=min(limit, 200)))


@api_view(["GET"])
def gender_gap(request):
    group = _group_param(request, "department")
    rows = list(_filtered(request).order_by().values(*ROW_FIELDS))
    return Response(insights.gender_gap(rows, group_by=group))
