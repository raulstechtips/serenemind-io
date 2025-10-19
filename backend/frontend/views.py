from django.shortcuts import render
from django.views.generic import TemplateView
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin


class TestDashboardView(LoginRequiredMixin, TemplateView):
    """
    Test dashboard view to demonstrate Phase 1 implementation
    """
    template_name = 'pages/test_dashboard.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['current_date'] = 'Monday, October 13, 2025'
        return context


class MasterTasksView(LoginRequiredMixin, TemplateView):
    """
    Master Task Library view - Phase 2 implementation
    CRUD interface for managing master task definitions
    """
    template_name = 'pages/master_tasks.html'


# Function-based view alternative
@login_required
def test_dashboard(request):
    """Test dashboard view (function-based)"""
    return render(request, 'pages/test_dashboard.html', {
        'current_date': 'Monday, October 13, 2025'
    })


@login_required
def master_tasks(request):
    """Master Tasks view (function-based)"""
    return render(request, 'pages/master_tasks.html')


@login_required
def templates(request):
    """Templates view (function-based) - Phase 3 implementation"""
    return render(request, 'pages/templates.html')


@login_required
def dashboard(request):
    """Dashboard view (function-based) - Phase 4 implementation
    Main daily view with date navigation and task management
    """
    return render(request, 'pages/dashboard.html')


def login(request):
    """Login view (function-based) - Phase 4 implementation
    Login view with email and password input
    """
    return render(request, 'account/login.html')

def signup(request):
    """Signup view (function-based) - Phase 4 implementation
    Signup view with email and password input
    """
    return render(request, 'account/signup.html')

def password_reset(request):
    """Password reset request view
    Allows user to request a password reset email
    """
    return render(request, 'account/password_reset.html')

def password_reset_confirm(request, key):
    """Password reset confirm view (with key from email)
    Validates the reset key before showing the form
    """
    import requests
    from django.http import Http404
    
    # Validate the key by calling Allauth's GET endpoint with headers
    try:
        # Build the URL for key validation
        base_url = request.build_absolute_uri('/')
        validation_url = f"{base_url}_allauth/browser/v1/auth/password/reset"
        
        # Prepare headers with the key
        headers = {
            'X-Password-Reset-Key': key,
            'Content-Type': 'application/json'
        }
        
        # Make GET request to validate the key with headers
        response = requests.get(validation_url, headers=headers)
        
        # If key is valid (200), render the page
        if response.status_code == 200:
            return render(request, 'account/password_reset_confirm.html')
        else:
            # Invalid key - return 404
            raise Http404("Invalid or expired password reset link")
            
    except Exception as e:
        # Any error validating the key - return 404
        raise Http404("Invalid or expired password reset link")
