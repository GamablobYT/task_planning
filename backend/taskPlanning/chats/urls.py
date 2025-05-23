from django.urls import path
from . import views

urlpatterns = [
    path('save-chat/', views.save_chat_history, name='register'),
    path('get-chat-history/<str:chat_id>/', views.get_chat_history, name='get_chat_history'),
    path('get-chat-ids/', views.get_chat_ids, name='get_chat_ids'),
]