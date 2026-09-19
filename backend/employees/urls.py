from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("employees", views.EmployeeViewSet, basename="employee")

urlpatterns = [
    path("meta/", views.meta),
    path("", include(router.urls)),
]
