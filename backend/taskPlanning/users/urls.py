from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.register, name='register'),
    path('login/', views.user_login, name='login'),
    path('csrf/', views.csrf_token, name='csrf_token'),
    path('session-check/', views.check_session, name='session-check'),
    path('logout/', views.user_logout, name='logout'),
    path('profile/', views.profile, name='profile'),
    path('fetch-users/', views.fetch_users, name='fetch_users'),
    path('update/<str:username>/', views.update_user, name='update_user'),
    path('delete/<str:user_name>', views.delete_user, name='delete_user'),
    path('get-role/', views.get_role, name='get_role'),
]