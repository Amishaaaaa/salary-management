import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create (or reset the password of) the HR manager login. Idempotent."

    def add_arguments(self, parser):
        parser.add_argument("--username", default=os.environ.get("HR_USERNAME", "hr@acme.com"), help="The login, an email address.")
        parser.add_argument("--password", default=os.environ.get("HR_PASSWORD"))

    def handle(self, *args, username, password, **options):
        if not password:
            raise CommandError("Provide --password or set HR_PASSWORD.")
        username = username.strip().lower()  # matches the login view, which lowercases what is typed
        user, created = get_user_model().objects.get_or_create(username=username, defaults={"first_name": "HR", "last_name": "Manager"})
        if "@" in username:
            user.email = username
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} user '{username}'."))
