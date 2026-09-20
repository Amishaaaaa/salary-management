# syntax=docker/dockerfile:1
# One image serves both the API and the built React app, so there is a single URL and no CORS to configure.

# ---- Stage 1: build the frontend
FROM node:20-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: the runtime image
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_DEBUG=0
WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend /build/dist ./frontend_dist
# Pre-compress the assets; WhiteNoise serves the .gz/.br variant to browsers that accept it (~925 kB -> ~280 kB).
RUN python -m whitenoise.compress frontend_dist
# collectstatic needs a key to import settings; this one exists only for the build step.
RUN DJANGO_SECRET_KEY=build-only python manage.py collectstatic --noinput

COPY deploy/start.sh /app/start.sh
RUN chmod +x /app/start.sh && useradd --create-home app && chown -R app /app
USER app

EXPOSE 8000
CMD ["/app/start.sh"]
