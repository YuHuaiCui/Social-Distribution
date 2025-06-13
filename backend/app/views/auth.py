from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import login, logout
from django.conf import settings
import requests
from app.models import Author
from app.serializers.author import AuthorSerializer

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def auth_status(request):
    """
    Returns authentication status and user info if authenticated
    """
    if request.user.is_authenticated:
        try:
            # The Author model already has the User fields (it's the user)
            author = Author.objects.get(id=request.user.id)
            serializer = AuthorSerializer(author)
            return Response({
                'isAuthenticated': True,
                'user': serializer.data
            })
        except Author.DoesNotExist:
            return Response({
                'isAuthenticated': True,
                'user': None,
                'message': 'User exists but author profile not found'
            })
    else:
        return Response({
            'isAuthenticated': False
        })

@api_view(['POST'])
@permission_classes([AllowAny])
def github_callback(request):
    """Handle GitHub OAuth callback"""
    code = request.data.get('code')
    
    if not code:
        return Response({'message': 'No authorization code provided'}, status=400)
    
    # The user should already be authenticated by django-allauth at this point
    if request.user.is_authenticated:
        try:
            author = Author.objects.get(id=request.user.id)
            serializer = AuthorSerializer(author)
            return Response({
                'success': True,
                'user': serializer.data
            })
        except Author.DoesNotExist:
            return Response({
                'success': True,
                'user': None,
                'message': 'User exists but author profile not found'
            })
    else:
        # If they're not authenticated yet, we need to check auth status
        return Response({
            'message': 'Authentication status pending, check /api/auth/status/',
            'pendingAuth': True
        })

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def author_me(request):
    """Get or update the current authenticated author's info"""
    try:
        # Get the current user's author profile
        author = Author.objects.get(id=request.user.id)
        
        if request.method == 'GET':
            serializer = AuthorSerializer(author)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            # Update the author profile
            serializer = AuthorSerializer(author, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                return Response(serializer.errors, status=400)
        
    except Author.DoesNotExist:
        return Response({'message': 'Author profile not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout the current user"""
    logout(request)
    return Response({'success': True})