from django.shortcuts import render
from django.views.generic import TemplateView
from django.http import HttpResponse
import os
from django.conf import settings

class ReactAppView(TemplateView):
    """
    Serves the React app from the built static files
    """
    def get(self, request, *args, **kwargs):
        try:
            with open(os.path.join(settings.STATIC_ROOT, 'index.html')) as f:
                return HttpResponse(f.read())
        except:
            return HttpResponse(
                """
                <h1>React App Not Found</h1>
                <p>The React build files are not present. Please ensure the frontend has been built and deployed.</p>
                <p>API is available at <a href="/api/">/api/</a></p>
                """,
                content_type="text/html"
            )