from django.urls import path
from . import views

app_name = 'authentication'

urlpatterns = [
    # Profile API endpoint
    path('api/profile/', views.ProfileAPIView.as_view(), name='profile-api'),
    
    # Profile page (Template that consumes the API)
    path('profile/', views.profile_view, name='profile'),
]
