# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import status
from django.middleware.csrf import get_token
from .managers import UserManager
from django.contrib.auth.models import User
from django.contrib.auth import login, logout

def csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})

@api_view(['POST'])
def register(request):
    return UserManager.register_user(request.data)

@api_view(['POST'])
def user_login(request):
    return UserManager.login_user(
        request,
        request.data.get("username"),
        request.data.get("password"),
        request.data.get("rememberMe", False)
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def images(request):
    return Response({"message": "Authorized to view images"}, status=200)

@api_view(['GET'])
def check_session(request):
    user = get_user(request)
    if user.is_authenticated:
        return Response({"authenticated": True, "username": user.username}, status=200)
    return Response({"authenticated": False}, status=401)

@api_view(['POST'])
def user_logout(request):
    logout(request)
    return Response({"message": "Logged out successfully"}, status=200)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile(request):
    if request.method == 'GET':
        return UserManager.get_user_profile(get_user(request))
    elif request.method == 'PUT':
        return UserManager.update_user_profile(request.user, request)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])  # Only SAHELI and Admin users can access this view
def update_user(request, username):
    try:
        user = User.objects.get(username=username)
        return UserManager.update_user_profile(user, request)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fetch_users(request):
    user_data = UserManager.fetch_all_users()
    return JsonResponse(user_data, safe=False)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, user_name):
    return UserManager.delete_user(user_name)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_role(request):
    return UserManager.get_role(get_user(request))
