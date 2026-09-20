#!/bin/sh
# Container entrypoint. Prepares the database, then starts the web server.
# On a free host the disk is ephemeral, so every boot re-creates the (deterministic, synthetic) data.
set -e
cd /app/backend

python manage.py migrate --noinput
python manage.py seed_employees --if-empty      # 10,000 employees; a no-op if data already exists
python manage.py create_hr_user                 # reads HR_USERNAME / HR_PASSWORD; fails loudly if HR_PASSWORD is missing

exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 2 --threads 2 --timeout 60 \
  --access-logfile -
