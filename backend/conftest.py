import pytest


@pytest.fixture(autouse=True)
def fast_password_hasher(settings):
    """Real hashing is intentionally slow; tests don't need that cost."""
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
