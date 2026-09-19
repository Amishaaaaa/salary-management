from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle


def _user_payload(user):
    return {"username": user.username, "name": user.get_full_name() or user.username}


class LoginThrottle(ScopedRateThrottle):
    scope = "login"


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login(request):
    user = authenticate(username=request.data.get("username", ""), password=request.data.get("password", ""))
    if user is None:
        # One message for unknown user and wrong password, so it can't be used to discover usernames.
        return Response({"detail": "Invalid username or password."}, status=status.HTTP_400_BAD_REQUEST)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": _user_payload(user)})


@api_view(["POST"])
def logout(request):
    """Revoke the token server-side, so a copied token stops working too."""
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def me(request):
    return Response(_user_payload(request.user))
