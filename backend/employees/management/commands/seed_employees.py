from django.core.management.base import BaseCommand
from django.db import transaction

from employees.models import Employee, SalaryRecord
from employees.seeding import generate


class Command(BaseCommand):
    help = "Seed the database with deterministic synthetic employees (replaces existing data)."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=10_000)
        parser.add_argument("--seed", type=int, default=42)

    @transaction.atomic
    def handle(self, *args, count, seed, **options):
        SalaryRecord.objects.all().delete()
        Employee.objects.all().delete()
        employees, records = generate(count, seed)
        Employee.objects.bulk_create(employees, batch_size=1000)
        SalaryRecord.objects.bulk_create(records, batch_size=1000)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(employees)} employees, {len(records)} salary records."))
