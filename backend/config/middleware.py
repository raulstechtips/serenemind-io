from django.http import HttpResponse
from django.shortcuts import redirect
import logging

logger = logging.getLogger(__name__)


def health_check_middleware(get_response):
    """
    Middleware that returns a plain text health check response for requests to "/health/".
    
    For requests to "/health/", responds immediately with "Healthy!" and does not perform any database or application checks. All other requests are passed to the next middleware or view.
    """
    def middleware(request):
        # Health-check request - lightweight check
        if request.path == "/health/":
            # Just check if Django is responding - no DB connection needed
            return HttpResponse("Healthy!", content_type="text/plain")

        # Regular requests
        return get_response(request)

    return middleware
