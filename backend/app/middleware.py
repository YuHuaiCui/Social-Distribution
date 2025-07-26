"""
Custom middleware for handling cross-origin session cookies in development
"""

class CrossOriginSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # In development, allow cross-origin session cookies
        if hasattr(response, 'cookies') and 'sessionid' in response.cookies:
            # Remove SameSite restriction for development
            response.cookies['sessionid']['samesite'] = 'None'
            response.cookies['sessionid']['secure'] = False
            
        if hasattr(response, 'cookies') and 'csrftoken' in response.cookies:
            # Remove SameSite restriction for CSRF token too
            response.cookies['csrftoken']['samesite'] = 'None'
            response.cookies['csrftoken']['secure'] = False
            
        return response 