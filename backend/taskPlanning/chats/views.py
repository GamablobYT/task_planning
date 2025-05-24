# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import status
from django.middleware.csrf import get_token
from django.contrib.auth.models import User
from django.contrib.auth import login, logout
from .models import Messages

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_chat_history(request):
    """
    Save chat history to the database.
    """
    #user = get_user(request)
    #if not user.is_authenticated:
    #    return JsonResponse({"error": "User not authenticated"}, status=401)

    data = request.data
    user = get_user(request)
    chat_id = data.get("chat_id")
    message = data.get("message")

    if not chat_id or not message:
        return JsonResponse({"error": "Chat ID and message are required"}, status=400)

    try:
        chat = Messages.objects.create(
            chat_id=chat_id,
            message=message,
            user=user,
        )
        chat.save() # Save the message to the database
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"message": "Chat history saved successfully"})
    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_chat_history(request, chat_id):
    """
    Retrieve all chat history from the database for a specific id.
    """
    user = get_user(request)

    if not Messages.objects.filter(chat_id=chat_id).exists():
        return JsonResponse({"error": "Chat doesn't exist or has no messages"})

    # Check if user has access to this chat
    chat_messages = Messages.objects.filter(chat_id=chat_id)
    if chat_messages.exists() and chat_messages.first().user != user:
        return JsonResponse({"error": "You don't have access to this chat"}, status=400)

    try:
        chat_history = Messages.objects.filter(chat_id=chat_id).order_by('time_sent')
        chat_list = []
        for chat in chat_history:
            chat_list.append({
                "message": chat.message,
                "time_sent": chat.time_sent
            })
        return JsonResponse(chat_list, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_chat_ids(request):
    """
    Retrieve all chat IDs from the database for a user.
    """
    user = get_user(request)
    try:
        # Filter chat IDs based on the user
        chat_ids = Messages.objects.filter(user=user).values_list('chat_id', flat=True).distinct()
        return JsonResponse(list(chat_ids), safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)