from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
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
def signup(request):
    """Handle user registration"""
    data = request.data
    print(f"Signup request data: {data}")  # Debug log
    
    # Validate required fields
    required_fields = ['username', 'email', 'password', 'display_name']
    for field in required_fields:
        if field not in data:
            return Response({'message': f'{field} is required'}, status=400)
    
    # Check if username already exists
    if Author.objects.filter(username=data['username']).exists():
        return Response({'message': 'Username already exists'}, status=400)
    
    # Check if email already exists
    if Author.objects.filter(email=data['email']).exists():
        return Response({'message': 'Email already exists'}, status=400)
    
    # Validate password
    try:
        validate_password(data['password'])
    except ValidationError as e:
        return Response({'message': ' '.join(e.messages)}, status=400)
    
    try:
        # Create the author/user
        author = Author.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            display_name=data.get('display_name', data['username']),
            github_username=data.get('github_username', ''),
            bio=data.get('bio', ''),
            location=data.get('location', ''),
            website=data.get('website', ''),
            is_approved=True,  # Auto-approve for now
            is_active=True
        )
        
        # Login the user with the default Django backend
        login(request, author, backend='django.contrib.auth.backends.ModelBackend')
        
        # Return the created author data
        serializer = AuthorSerializer(author)
        return Response({
            'success': True,
            'user': serializer.data,
            'message': 'Account created successfully'
        }, status=201)
        
    except Exception as e:
        return Response({'message': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Handle user login"""
    username = request.data.get('username')
    password = request.data.get('password')
    remember_me = request.data.get('remember_me', False)
    
    if not username or not password:
        return Response({'message': 'Username and password are required'}, status=400)
    
    # Authenticate user
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        # Login the user with the default Django backend
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        
        # Set session timeout based on remember_me preference
        if remember_me:
            # Remember me: 2 weeks (current default)
            request.session.set_expiry(1209600)  # 2 weeks in seconds
        else:
            # Regular login: 24 hours
            request.session.set_expiry(86400)  # 24 hours in seconds
        
        # Get the author data
        try:
            author = Author.objects.get(id=user.id)
            serializer = AuthorSerializer(author)
            return Response({
                'success': True,
                'user': serializer.data,
                'message': 'Login successful'
            })
        except Author.DoesNotExist:
            return Response({
                'success': True,
                'user': None,
                'message': 'User exists but author profile not found'
            })
    else:
        return Response({'message': 'Invalid username or password'}, status=401)

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