from dataclasses import dataclass
from typing import Any

from allauth.account.adapter import DefaultAccountAdapter
from allauth.headless.adapter import DefaultHeadlessAdapter


@dataclass
class CustomUserData:
    """
    Custom user data structure for headless API responses.
    This dataclass is used to generate the OpenAPI specification.
    """
    id: str
    display: str
    email: str
    first_name: str
    last_name: str
    has_usable_password: bool


class CustomAccountAdapter(DefaultAccountAdapter):
    """Custom adapter for allauth account handling"""
    
    def is_open_for_signup(self, request):
        """Allow signups"""
        return True
    
    def save_user(self, request, user, form, commit=True):
        """
        Customize user creation - extract first_name and last_name from request.
        Works with both traditional forms (POST) and headless API (JSON).
        """
        user = super().save_user(request, user, form, commit=False)
        
        # Try to get data from form first (headless API), then fall back to POST (traditional)
        if hasattr(form, 'cleaned_data'):
            user.first_name = form.cleaned_data.get('first_name', '').strip()
            user.last_name = form.cleaned_data.get('last_name', '').strip()
        else:
            # Fallback to POST data for traditional forms
            data = request.POST
            user.first_name = data.get('first_name', '').strip()
            user.last_name = data.get('last_name', '').strip()
        
        # Users are active immediately (no approval needed)
        user.is_active = True
        
        if commit:
            user.save()
        return user


class CustomHeadlessAdapter(DefaultHeadlessAdapter):
    """
    Custom adapter for allauth headless API responses.
    Uses dataclass pattern for proper OpenAPI spec generation.
    """
    
    def get_user_dataclass(self):
        """
        Return the dataclass that defines the user payload structure.
        This is used to generate the OpenAPI specification.
        """
        return CustomUserData
    
    def user_as_dataclass(self, user):
        """
        Convert a User instance to our custom dataclass.
        This method populates the dataclass with user data.
        """
        return CustomUserData(
            id=str(user.id),
            display=user.email,  # or user.get_full_name() if you prefer
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            has_usable_password=user.has_usable_password()
        )

