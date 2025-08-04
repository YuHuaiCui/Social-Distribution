"""
Custom middleware for handling cross-origin session cookies
"""

from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class CrossOriginSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Debug incoming request
        print(f"DEBUG 403 MIDDLEWARE: Processing request to {request.path}")
        print(f"DEBUG 403 MIDDLEWARE: Method: {request.method}")
        print(f"DEBUG 403 MIDDLEWARE: User: {request.user if hasattr(request, 'user') else 'No user'}")
        print(f"DEBUG 403 MIDDLEWARE: User authenticated: {request.user.is_authenticated if hasattr(request, 'user') else 'No user'}")
        print(f"DEBUG 403 MIDDLEWARE: Authorization header: {request.META.get('HTTP_AUTHORIZATION', 'None')}")
        print(f"DEBUG 403 MIDDLEWARE: Origin: {request.META.get('HTTP_ORIGIN', 'None')}")
        print(f"DEBUG 403 MIDDLEWARE: Referer: {request.META.get('HTTP_REFERER', 'None')}")
        
        response = self.get_response(request)
        
        # Debug response
        print(f"DEBUG 403 MIDDLEWARE: Response status: {response.status_code}")
        if response.status_code == 403:
            print(f"DEBUG 403 MIDDLEWARE: 403 FORBIDDEN response for {request.path}")
            print(f"DEBUG 403 MIDDLEWARE: Response content: {response.content}")
        
        # Handle cross-origin session cookies
        if hasattr(response, 'cookies') and 'sessionid' in response.cookies:
            # SameSite=None is required for cross-origin requests
            response.cookies['sessionid']['samesite'] = 'None'
            # Secure must be True when using SameSite=None and HTTPS
            response.cookies['sessionid']['secure'] = not settings.DEBUG
            
        if hasattr(response, 'cookies') and 'csrftoken' in response.cookies:
            # SameSite=None is required for cross-origin requests
            response.cookies['csrftoken']['samesite'] = 'None'
            # Secure must be True when using SameSite=None and HTTPS
            response.cookies['csrftoken']['secure'] = not settings.DEBUG
            
        return response 