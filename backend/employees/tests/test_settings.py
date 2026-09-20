"""Guard rails on production configuration. Each case starts a fresh interpreter, because settings are read once at import."""
import os
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
PROBE = (
    "import json; from django.conf import settings as s; "
    "print(json.dumps({'debug': s.DEBUG, 'hosts': s.ALLOWED_HOSTS, 'cors_all': s.CORS_ALLOW_ALL_ORIGINS, "
    "'cors': s.CORS_ALLOWED_ORIGINS, 'ssl': getattr(s, 'SECURE_SSL_REDIRECT', False), "
    "'hsts': getattr(s, 'SECURE_HSTS_SECONDS', 0)}))"
)


def load_settings(**env):
    clean = {k: v for k, v in os.environ.items() if not k.startswith("DJANGO_")}
    clean.update(DJANGO_SETTINGS_MODULE="config.settings", **env)
    return subprocess.run([sys.executable, "-c", PROBE], cwd=BACKEND, env=clean, capture_output=True, text=True)


def test_production_refuses_to_start_without_a_secret_key():
    result = load_settings(DJANGO_DEBUG="0")
    assert result.returncode != 0 and "DJANGO_SECRET_KEY" in result.stderr


def test_debug_is_off_unless_explicitly_enabled():
    import json

    result = load_settings(DJANGO_SECRET_KEY="k")  # no DJANGO_DEBUG at all
    assert json.loads(result.stdout)["debug"] is False


def test_production_is_locked_down():
    import json

    result = load_settings(DJANGO_DEBUG="0", DJANGO_SECRET_KEY="k", DJANGO_ALLOWED_HOSTS="api.acme.test",
                           DJANGO_CORS_ORIGINS="https://app.acme.test")
    cfg = json.loads(result.stdout)
    assert cfg["hosts"] == ["api.acme.test"]
    assert cfg["cors_all"] is False and cfg["cors"] == ["https://app.acme.test"]
    assert cfg["ssl"] is True and cfg["hsts"] > 0


def test_development_mode_is_convenient_but_still_not_wide_open_on_hosts():
    import json

    cfg = json.loads(load_settings(DJANGO_DEBUG="1").stdout)
    assert cfg["cors_all"] is True and cfg["ssl"] is False
    assert cfg["hosts"] == ["localhost", "127.0.0.1"]
