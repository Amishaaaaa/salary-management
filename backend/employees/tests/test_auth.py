import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

PROTECTED = ["/api/employees/", "/api/meta/", "/api/insights/summary/", "/api/insights/payroll/",
             "/api/insights/percentiles/", "/api/insights/outliers/", "/api/insights/gender-gap/",
             "/api/employees/export/", "/api/auth/me/"]


@pytest.fixture
def hr(db):
    return get_user_model().objects.create_user(username="hr", password="s3cret-pass", first_name="Hana", last_name="Roe")


def login(client, username="hr", password="s3cret-pass"):
    return client.post("/api/auth/login/", {"username": username, "password": password}, format="json")


@pytest.mark.parametrize("url", PROTECTED)
def test_endpoints_reject_anonymous_requests(db, url):
    assert APIClient().get(url).status_code == 401


def test_write_endpoints_reject_anonymous_requests(db):
    assert APIClient().post("/api/employees/", {}, format="json").status_code == 401


def test_login_returns_token_and_user(hr):
    res = login(APIClient())
    assert res.status_code == 200 and res.data["token"]
    assert res.data["user"] == {"username": "hr", "name": "Hana Roe"}


def test_token_grants_access(hr):
    token = login(APIClient()).data["token"]
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    assert client.get("/api/employees/").status_code == 200
    assert client.get("/api/auth/me/").data["username"] == "hr"


@pytest.mark.parametrize("username,password", [("hr", "wrong"), ("nobody", "s3cret-pass"), ("", "")])
def test_bad_credentials_get_the_same_generic_error(hr, username, password):
    res = login(APIClient(), username, password)
    assert res.status_code == 400 and res.data["detail"] == "Invalid email or password."


def test_logout_revokes_the_token(hr):
    token = login(APIClient()).data["token"]
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    assert client.post("/api/auth/logout/").status_code == 204
    assert client.get("/api/employees/").status_code == 401


def test_create_hr_user_command_is_idempotent(db):
    from django.core.management import call_command

    call_command("create_hr_user", username="boss", password="one")
    call_command("create_hr_user", username="boss", password="two")
    assert get_user_model().objects.filter(username="boss").count() == 1
    assert login(APIClient(), "boss", "two").status_code == 200
    assert login(APIClient(), "boss", "one").status_code == 400


@pytest.fixture
def email_user(db):
    return get_user_model().objects.create_user(username="hr@acme.com", email="hr@acme.com", password="s3cret-pass")


@pytest.mark.parametrize("typed", ["hr@acme.com", "HR@Acme.com", "  hr@acme.com  ", "Hr@ACME.COM\t"])
def test_email_login_ignores_case_and_surrounding_spaces(email_user, typed):
    res = login(APIClient(), typed)
    assert res.status_code == 200 and res.data["user"]["username"] == "hr@acme.com"


def test_create_hr_user_defaults_to_the_demo_email_and_normalises_it(db):
    from django.core.management import call_command

    call_command("create_hr_user", password="pw")  # no --username: the default login
    call_command("create_hr_user", username="  Boss@Acme.COM ", password="pw")
    users = get_user_model().objects
    assert users.filter(username="hr@acme.com", email="hr@acme.com").exists()
    assert users.filter(username="boss@acme.com", email="boss@acme.com").exists()  # stored lowercase, email field filled
    assert login(APIClient(), "BOSS@acme.com", "pw").status_code == 200
