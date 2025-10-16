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
