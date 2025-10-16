from allauth.account.adapter import DefaultAccountAdapter


class CustomAccountAdapter(DefaultAccountAdapter):
    """Custom adapter for allauth account handling"""
    
    def is_open_for_signup(self, request):
        """Allow signups"""
        return True
    
    def save_user(self, request, user, form, commit=True):
        """
        Customize user creation - extract first_name and last_name from request
        This allows us to capture these fields without a custom signup form
        """
        user = super().save_user(request, user, form, commit=False)
        
        # Extract first_name and last_name from POST data
        # These fields are sent from our signup template
        data = request.POST
        user.first_name = data.get('first_name', '').strip()
        user.last_name = data.get('last_name', '').strip()
        
        # Users are active immediately (no approval needed)
        user.is_active = True
        
        if commit:
            user.save()
        return user

