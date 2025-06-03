# managers.py
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from rest_framework import status
from rest_framework.response import Response
from .serializers import UserSerializer
from .models import Profile

class UserManager:
    @staticmethod
    def register_user(data):
        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    def login_user(request, username, password, remember_me=False):
        user = authenticate(username=username, password=password)
        if user:
            login(request, user)
            expiry_time = 60 * 60 * 24 * 30 if remember_me else 60 * 60 * 2
            request.session.set_expiry(expiry_time)
            return Response({"message": "Login successful"}, status=status.HTTP_200_OK)
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    @staticmethod
    def get_user_profile(user):
        try:
            profile = user.profile
            if user.is_authenticated:
                return Response({
                    "name": f"{user.first_name} {user.last_name}",
                    "username": user.username,
                    "userid": profile.userid,
                })
            return Response({"name": "", "username": "", "id": ""})
        except Profile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=404)

    @staticmethod
    def update_user_profile(user, request):
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    @staticmethod
    def fetch_all_users():
        users = User.objects.all().order_by('id')
        user_data = [
            {
                "name": f"{user.first_name} {user.last_name}",
                "username": user.username,
                # "userid": user.profile.userid,
                "role": user.profile.role,
            }
            for user in users
        ]
        return user_data
    
    @staticmethod
    def delete_user(user_name):
        '''Deletes a user from the database'''
        try:
            user = User.objects.get(username=user_name)
            user.delete()
            return Response({"message": "User deleted successfully"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    @staticmethod
    def get_role(user):
        '''Returns the role of the user'''
        try:
            return Response({"role": user.profile.role}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)