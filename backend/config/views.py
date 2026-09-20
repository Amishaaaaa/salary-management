from django.conf import settings
from django.http import Http404, HttpResponse
from django.views.decorators.http import require_safe


@require_safe
def spa_index(request, path=""):
    """Serve the built React app for every non-API route, so deep links like /insights survive a refresh."""
    index = settings.FRONTEND_DIST / "index.html"
    if not index.is_file():
        raise Http404("Frontend has not been built.")
    response = HttpResponse(index.read_text(encoding="utf-8"), content_type="text/html")
    response["Cache-Control"] = "no-cache"  # the hashed assets are cached forever; index.html must always be fresh
    return response
