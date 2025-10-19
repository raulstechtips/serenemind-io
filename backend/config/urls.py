"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from frontend.views import test_dashboard, master_tasks, templates, dashboard, login, signup, password_reset, password_reset_confirm

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # Headless API endpoints (for authentication)
    path("_allauth/", include("allauth.headless.urls")),
    path('account/login/', login, name='login'),
    path('account/signup/', signup, name='signup'),
    path('account/password/reset/', password_reset, name='password_reset'),
    path('account/password/reset/key/<str:key>/', password_reset_confirm, name='password_reset_confirm'),
    # Traditional allauth URLs (OPTIONAL: Can be removed since we use custom views + headless API)
    path('auth/', include('allauth.urls')),
    
    # Custom account management URLs (profile, etc.)
    path('account/', include('authentication.urls')),
    

    # API endpoints
    path("api/", include("tasks.urls")),
    
    # Frontend pages
    path("", dashboard, name="dashboard"),  # Main dashboard (Phase 4)
    path("test/", test_dashboard, name="test_dashboard"),  # Keep test page
    path("tasks/", master_tasks, name="master_tasks"),
    path("templates/", templates, name="templates"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
    # Test error pages in development (visit /test-404/ or /test-403/ or /test-500/ to preview)
    from django.shortcuts import render
    urlpatterns += [
        path('test-404/', lambda request: render(request, '404.html', status=404)),
        path('test-403/', lambda request: render(request, '403.html', status=403)),
        path('test-500/', lambda request: render(request, '500.html', status=500)),
    ]

# Custom error handlers (Django will use these templates automatically in production)
handler404 = 'django.views.defaults.page_not_found'
handler403 = 'django.views.defaults.permission_denied'
handler500 = 'django.views.defaults.server_error'