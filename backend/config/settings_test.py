"""Settings for the test suite: development-mode defaults, made explicit rather than accidental."""
import os

os.environ.setdefault("DJANGO_DEBUG", "1")

from .settings import *  # noqa: E402,F401,F403
