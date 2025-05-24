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
    time_sent = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chat {self.message} for id:{self.chat_id}"