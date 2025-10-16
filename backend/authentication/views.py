from django.http import JsonResponse
from django.views import View
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.shortcuts import render
import json


@method_decorator(login_required, name='dispatch')
class ProfileAPIView(View):
    """API endpoint for user profile (GET and PUT)"""
    
    def get(self, request):
        """Get current user's profile data"""
        user = request.user
        profile = user.profile
        
        return JsonResponse({
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'username': user.username,
            'avatar': profile.avatar,
            'last_activity': profile.last_activity.isoformat() if profile.last_activity else None,
            'date_joined': user.date_joined.isoformat() if user.date_joined else None,
            'last_login': user.last_login.isoformat() if user.last_login else None,
        })
    
    def put(self, request):
        """Update current user's profile data"""
        try:
            data = json.loads(request.body)
            user = request.user
            profile = user.profile
            
            # Validate and update fields
            errors = {}
            
            # Update first name (required)
            if 'first_name' in data:
                first_name = data['first_name'].strip()
                if not first_name:
                    errors['first_name'] = 'First name is required'
                elif len(first_name) > 150:
                    errors['first_name'] = 'First name must be 150 characters or less'
                else:
                    user.first_name = first_name
            
            # Update last name (required)
            if 'last_name' in data:
                last_name = data['last_name'].strip()
                if not last_name:
                    errors['last_name'] = 'Last name is required'
                elif len(last_name) > 150:
                    errors['last_name'] = 'Last name must be 150 characters or less'
                else:
                    user.last_name = last_name
            
            # Update email (with validation)
            if 'email' in data:
                email = data['email'].strip().lower()
                try:
                    validate_email(email)
                    # Check if email is already taken by another user
                    from .models import User
                    if User.objects.filter(email=email).exclude(id=user.id).exists():
                        errors['email'] = 'This email is already in use'
                    else:
                        user.email = email
                except ValidationError:
                    errors['email'] = 'Enter a valid email address'
            
            # Update avatar URL
            if 'avatar' in data:
                avatar = data['avatar'].strip()
                if avatar and len(avatar) > 500:
                    errors['avatar'] = 'Avatar URL must be 500 characters or less'
                else:
                    profile.avatar = avatar
            
            # If there are validation errors, return them
            if errors:
                return JsonResponse({
                    'success': False,
                    'errors': errors
                }, status=400)
            
            # Save changes
            user.save()
            profile.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Profile updated successfully!',
                'data': {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'avatar': profile.avatar,
                    'last_activity': profile.last_activity.isoformat() if profile.last_activity else None,
                }
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)


@login_required
def profile_view(request):
    """
    Profile page view - renders the profile template
    The template uses Alpine.js to fetch/update data via ProfileAPIView
    """
    return render(request, 'pages/profile.html')
