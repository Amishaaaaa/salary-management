from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import insight_views, views

router = DefaultRouter()
router.register("employees", views.EmployeeViewSet, basename="employee")

urlpatterns = [
    path("meta/", views.meta),
    path("insights/summary/", insight_views.summary),
    path("insights/payroll/", insight_views.payroll),
    path("insights/percentiles/", insight_views.percentiles),
    path("insights/outliers/", insight_views.outliers),
    path("insights/gender-gap/", insight_views.gender_gap),
    path("", include(router.urls)),
]
