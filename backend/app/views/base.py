from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

# Create your views here.

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint to verify the API is working properly.
    """
    try:
        # Test database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_healthy = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_healthy = False
    
    # Test cache connection
    try:
        cache.set('health_check', 'ok', 10)
        cache_healthy = cache.get('health_check') == 'ok'
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        cache_healthy = False
    
    if db_healthy and cache_healthy:
        return Response({
            'status': 'healthy',
            'database': 'ok',
            'cache': 'ok',
            'timestamp': '2025-01-27T00:00:00Z'
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'status': 'unhealthy',
            'database': 'ok' if db_healthy else 'error',
            'cache': 'ok' if cache_healthy else 'error',
            'timestamp': '2025-01-27T00:00:00Z'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
