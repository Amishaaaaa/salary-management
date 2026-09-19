from datetime import date

from rest_framework import serializers

from . import services
from .models import Employee, SalaryRecord

MAX_SALARY = 100_000_000  # whole local-currency units; guards against typos like an extra 000s


class SalaryRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryRecord
        fields = ["id", "amount", "currency", "effective_date", "reason"]


class EmployeeSerializer(serializers.ModelSerializer):
    # Optional context for the history row when salary changes (write-only, not stored on Employee).
    change_reason = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=120)
    effective_date = serializers.DateField(write_only=True, required=False)

    class Meta:
        model = Employee
        fields = [
            "id", "first_name", "last_name", "email", "job_title", "department", "level", "gender",
            "country", "hire_date", "salary", "currency", "salary_usd", "change_reason", "effective_date",
        ]
        read_only_fields = ["currency", "salary_usd"]

    def validate_salary(self, value):
        if not 0 < value <= MAX_SALARY:
            raise serializers.ValidationError(f"Salary must be between 1 and {MAX_SALARY:,}.")
        return value

    def validate_hire_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Hire date cannot be in the future.")
        return value

    def create(self, validated_data):
        validated_data.pop("change_reason", None)
        validated_data.pop("effective_date", None)
        return services.create_employee(validated_data)

    def update(self, instance, validated_data):
        reason = validated_data.pop("change_reason", "")
        effective = validated_data.pop("effective_date", None)
        return services.update_employee(instance, validated_data, effective_date=effective, reason=reason)
