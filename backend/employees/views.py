import csv

from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from . import constants
from .filters import EmployeeFilter
from .models import Employee
from .serializers import EmployeeSerializer, SalaryRecordSerializer

CSV_COLUMNS = ["id", "first_name", "last_name", "email", "job_title", "department", "level",
               "gender", "country", "hire_date", "currency", "salary", "salary_usd"]


class EmployeePagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    pagination_class = EmployeePagination
    filterset_class = EmployeeFilter
    search_fields = ["first_name", "last_name", "email", "job_title"]
    ordering_fields = ["last_name", "first_name", "salary_usd", "hire_date", "country", "department", "level"]

    @action(detail=True, methods=["get"], url_path="salary-history", pagination_class=None)
    def salary_history(self, request, pk=None):
        records = self.get_object().salary_history.all()
        return Response(SalaryRecordSerializer(records, many=True).data)

    @action(detail=False, methods=["get"])
    def export(self, request):
        """CSV of the *filtered* list (same query params as the list endpoint), unpaginated, streamed row by row."""
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="employees.csv"'
        writer = csv.writer(response)
        writer.writerow(CSV_COLUMNS)
        for row in queryset.values_list(*CSV_COLUMNS).iterator(chunk_size=2000):
            writer.writerow(row)
        return response


@api_view(["GET"])
def meta(request):
    """Static + data-driven options so the UI can build filter dropdowns without hard-coding."""
    titles = Employee.objects.order_by().values_list("job_title", flat=True).distinct()
    return Response({
        "countries": [{"code": c, "currency": cur} for c, cur in constants.COUNTRY_CURRENCY.items()],
        "departments": constants.DEPARTMENTS,
        "levels": constants.LEVELS,
        "genders": constants.GENDERS,
        "job_titles": sorted(titles),
    })
