from django.db import models
from django.contrib.auth.models import User
import uuid

class Profile(models.Model):
    ROLE_CHOICES = (
        ('SAHELI', 'Saheli'),
        ('PEASANT', 'Peasant'),
        ('ADMIN', 'Admin'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    userid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='ADMIN')
    
    def __str__(self):
        return f"{self.user.username}'s profile"