from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import auth_views, insight_views, views

router = DefaultRouter()
router.register("employees", views.EmployeeViewSet, basename="employee")

urlpatterns = [
    path("auth/login/", auth_views.login),
    path("auth/logout/", auth_views.logout),
    path("auth/me/", auth_views.me),
    path("meta/", views.meta),
    path("insights/summary/", insight_views.summary),
    path("insights/payroll/", insight_views.payroll),
    path("insights/percentiles/", insight_views.percentiles),
    path("insights/outliers/", insight_views.outliers),
    path("insights/gender-gap/", insight_views.gender_gap),
    path("", include(router.urls)),
]
