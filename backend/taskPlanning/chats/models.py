from django.db import models
from django.contrib.auth.models import User
import uuid

#chat model
class Messages(models.Model):
    """
    Model to store chat messages.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    chat_id = models.UUIDField(editable=False)
    message = models.JSONField()
    model = models.CharField(max_length=255, blank=True, null=True)  # Optional field for model name
    message_id = models.UUIDField(default=uuid.uuid4, null=True)
    time_sent = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chat {self.message} for id:{self.chat_id}"

class Chats(models.Model):
    """
    Model to store chat metadata like name, user
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    chat_id = models.UUIDField(unique=True)  # Store chat_id directly
    chat_name = models.CharField(max_length=255, blank=True, null=True)
    initialized_inputs = models.JSONField(blank=True, null=True)  # Optional field for initialized inputs
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chat {self.chat_name or self.chat_id} for {self.user.username}"