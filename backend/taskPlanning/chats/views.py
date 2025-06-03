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
from .models import Messages, Chats
from django.db.models import Max
from pydantic import BaseModel, ValidationError, ConfigDict
from typing import Dict, List, Optional

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_chat_history(request):
    """
    Save chat history to the database.
    """
    data = request.data
    user = get_user(request)
    chat_id = data.get("chat_id")
    message = data.get("message")
    message_id = data.get("message_id")
    chat_name = data.get("chat_name")  # Optional chat name

    if not chat_id or not message:
        return JsonResponse({"error": "Chat ID and message are required"}, status=400)

    try:
        # Create or get the chat entry
        chat_obj, created = Chats.objects.get_or_create(
            chat_id=chat_id,
            user=user,
            defaults={'chat_name': chat_name}
        )
        
        # Create the message
        message_obj = Messages.objects.create(
            chat_id=chat_id,
            message=message,
            user=user,
            message_id=message_id
        )
        # message_obj.save()  # Not needed - create() already saves
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
                "message_id": str(chat.message_id),
                "time_sent": chat.time_sent
            })
        return JsonResponse(chat_list, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_chat_ids(request):
    """
    Retrieve all chats for a user with names, ordered by creation time (most recent first).
    """
    user = get_user(request)
    try:
        chats = Chats.objects.filter(user=user).order_by('-created_at')
        chat_list = []
        for chat in chats:
            chat_list.append({
                "chat_id": str(chat.chat_id),
                "chat_name": chat.chat_name,
            })
        return JsonResponse(chat_list, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_chat(request, chat_id):
    """
    Delete a specific chat by ID.
    """
    user = get_user(request)

    try:
        # Delete from both Messages and Chats tables
        messages = Messages.objects.filter(chat_id=chat_id, user=user)
        chat = Chats.objects.filter(chat_id=chat_id, user=user)
        
        if not messages.exists() and not chat.exists():
            return JsonResponse({"error": "Chat doesn't exist or you don't have access"}, status=404)

        # Delete messages and chat metadata
        messages.delete()
        chat.delete()
        
        return JsonResponse({"message": "Chat deleted successfully"}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    

class JSONSchema(BaseModel):
    """
    Pydantic model for validating JSON schema.
    """
    #temp testing schema
    # model_config = ConfigDict(extra="forbid")  # Forbid extra fields not defined in the schema

    title: str
    description: str
    type: str = "object"  # Default to object type note: here type doesn't mean type its treated as a field that has default value object
    properties: Dict[str, str]  # Describes the properties of the object
    required: Optional[List[str]] = [] # Optional list of required properties

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def validate_json(request):
    """
    Validate provided JSON according to a schema.
    The request body should contain the JSON data to be validated.
    The schema itself is defined by the JSONSchema Pydantic model.
    For this example, we'll assume the schema is fixed as JSONSchema.
    In a more complex scenario, the schema might also come from the request
    or be dynamically determined.
    """
    try:
        data_to_validate = request.data
        # Attempt to parse and validate the data against our defined schema
        # This step implicitly validates if the provided data conforms to the structure
        # expected by JSONSchema (title, description, type, properties, required).
        # If the goal is to validate arbitrary JSON against an arbitrary schema,
        # this approach needs to be different. This validates *if the data itself is a valid schema*.

        # For validating data *against* a schema provided in the request,
        # you would first parse the schema, then use a library like jsonschema.
        # Here, we are validating if the input data *is* a schema that matches JSONSchema.
        
        # JSONSchema(**data_to_validate)
        return JsonResponse({"message": "JSON is valid according to the schema"}, status=status.HTTP_200_OK)
    except ValidationError as e:
        return JsonResponse({"error": "JSON validation failed", "details": e.errors()}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def set_chat_name(request, chat_id):
    """
    Set or update the name of a chat.
    """
    user = get_user(request)
    chat_name = request.data.get("chat_name")

    if not chat_name:
        return JsonResponse({"error": "Chat name is required"}, status=400)

    try:
        chat = Chats.objects.get(chat_id=chat_id, user=user)
        chat.chat_name = chat_name
        chat.save()
        return JsonResponse({"message": "Chat name updated successfully"}, status=200)
    except Chats.DoesNotExist:
        return JsonResponse({"error": "Chat not found or you don't have access"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)