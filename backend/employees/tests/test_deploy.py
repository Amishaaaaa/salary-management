"""Deployment plumbing: health check and serving the built single-page app from Django."""
import pytest
from rest_framework.test import APIClient

from employees.tests.test_settings import load_settings


@pytest.mark.django_db
def test_health_check_is_public_and_confirms_the_database():
    res = APIClient().get("/api/health/")
    assert res.status_code == 200 and res.json() == {"status": "ok"}


@pytest.fixture
def built_frontend(tmp_path, settings):
    (tmp_path / "index.html").write_text("<!doctype html><title>ACME Pay</title><div id=root></div>")
    settings.FRONTEND_DIST = tmp_path
    return tmp_path


@pytest.mark.parametrize("path", ["/", "/login", "/insights", "/employees", "/employees/some/deep/link"])
def test_client_side_routes_serve_the_app(built_frontend, path):
    res = APIClient().get(path)
    assert res.status_code == 200 and b"ACME Pay" in res.content
    assert res["Content-Type"].startswith("text/html")
    assert "no-cache" in res["Cache-Control"]  # a new deploy must never be masked by a cached index.html


@pytest.mark.parametrize("path,status", [("/api/does-not-exist/", 404), ("/admin/nope/", 302)])
def test_unknown_api_and_admin_paths_never_fall_through_to_the_app(built_frontend, path, status):
    res = APIClient().get(path)  # admin sends unknown URLs to its own login (302); the API returns a real 404
    assert res.status_code == status and b"ACME Pay" not in res.content


def test_the_app_is_read_only_over_http(built_frontend):
    assert APIClient().post("/insights").status_code == 405


def test_without_a_built_frontend_routes_are_404(settings, tmp_path):
    settings.FRONTEND_DIST = tmp_path / "missing"
    assert APIClient().get("/insights").status_code == 404


def test_render_hostname_is_allowed_automatically():
    import json

    cfg = json.loads(load_settings(DJANGO_DEBUG="0", DJANGO_SECRET_KEY="k", RENDER_EXTERNAL_HOSTNAME="acme-salary.onrender.com").stdout)
    assert "acme-salary.onrender.com" in cfg["hosts"]


def test_hashed_assets_are_cacheable_forever_but_other_files_are_not():
    from config.settings import _is_hashed_asset

    assert _is_hashed_asset("/x/assets/index-Cauxkoud.js", "/assets/index-Cauxkoud.js")
    assert not _is_hashed_asset("/x/favicon.svg", "/favicon.svg")  # not content-hashed, so it must stay revalidated


@pytest.mark.django_db
def test_large_api_responses_are_gzipped_for_browsers_that_accept_it():
    from employees.tests.factories import authed_client, make_employee

    for i in range(40):
        make_employee(email=f"user{i}@acme.test")
    client = authed_client()
    for path in ("/api/employees/export/", "/api/employees/"):
        res = client.get(path, headers={"accept-encoding": "gzip"})
        assert res.status_code == 200 and res["Content-Encoding"] == "gzip", path
    assert "Content-Encoding" not in client.get("/api/employees/export/")  # clients that do not ask get plain bytes
