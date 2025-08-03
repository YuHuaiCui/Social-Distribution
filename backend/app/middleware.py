"""
Custom middleware for handling cross-origin session cookies
"""

from django.conf import settings

class CrossOriginSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
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