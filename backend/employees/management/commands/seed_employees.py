from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from employees.models import Employee, SalaryRecord
from employees.seeding import generate


class Command(BaseCommand):
    help = (
        "Seed the database with deterministic synthetic employees. "
        "Refuses to touch a database that already has employees unless --reset or --if-empty is given."
    )

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=10_000)
        parser.add_argument("--seed", type=int, default=42)
        mode = parser.add_mutually_exclusive_group()
        mode.add_argument("--reset", action="store_true", help="DELETE all existing employees and history, then reseed.")
        mode.add_argument("--if-empty", action="store_true", help="Do nothing if employees already exist (safe for deploy scripts).")

    @transaction.atomic
    def handle(self, *args, count, seed, reset, if_empty, **options):
        existing = Employee.objects.count()
        if existing and if_empty:
            self.stdout.write(f"Skipped: database already has {existing} employees.")
            return
        if existing and not reset:
            raise CommandError(
                f"The database already has {existing} employees. Seeding would delete them. "
                "Re-run with --reset to wipe and reseed, or --if-empty to skip."
            )
        SalaryRecord.objects.all().delete()
        Employee.objects.all().delete()
        employees, records = generate(count, seed)
        Employee.objects.bulk_create(employees, batch_size=1000)
        SalaryRecord.objects.bulk_create(records, batch_size=1000)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(employees)} employees, {len(records)} salary records."))
