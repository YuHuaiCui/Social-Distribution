from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.conf import settings
import requests
import base64
import binascii
from app.models import Author
from app.models.node import Node
from app.serializers.author import AuthorSerializer


def parse_basic_auth(request):
    """
    Parse HTTP Basic Authentication from Authorization header.
    
    Returns:
        tuple: (username, password) if valid Basic Auth header exists
        tuple: (None, None) if no valid Basic Auth header
    """
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Basic '):
        return None, None
    
    try:
        # Remove 'Basic ' prefix and decode base64
        encoded_credentials = auth_header[6:].strip()
        
        # Check if we have any credentials to decode
        if not encoded_credentials:
            return None, None
            
        decoded_credentials = base64.b64decode(encoded_credentials).decode('utf-8')
        
        # Check if decoded credentials contain a colon separator
        if ':' not in decoded_credentials:
            return None, None
            
        # Split on first colon only (password may contain colons)
        username, password = decoded_credentials.split(':', 1)
        
        # Return None if either username or password is empty
        if not username or not password:
            return None, None
            
        return username, password
    except (ValueError, UnicodeDecodeError, base64.binascii.Error):
        return None, None


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def auth_status(request):
    """
    Check authentication status and return user information.

    This endpoint allows the frontend to determine if a user is logged in
    and get their basic profile information. Used for session persistence
    across browser refreshes.

    Returns:
        200 OK: Authentication status and user data (if authenticated)
    """
    # Safety check for request.user
    if request.user is None:
        return Response({"isAuthenticated": False, "error": "User object not available"})
    
    # Debug authentication status
    print(f"DEBUG: Auth status check - User: {request.user}")
    print(f"DEBUG: User is authenticated: {request.user.is_authenticated}")
    print(f"DEBUG: Session key: {request.session.session_key}")
    print(f"DEBUG: Request headers: {dict(request.headers)}")
    
    if request.user.is_authenticated:
        try:
            # The Author model extends User, so we get the author by user ID
            author = Author.objects.get(id=request.user.id)
            serializer = AuthorSerializer(author)
            return Response({"isAuthenticated": True, "user": serializer.data})
        except Author.DoesNotExist:
            return Response(
                {
                    "isAuthenticated": True,
                    "user": None,
                    "message": "User exists but author profile not found",
                }
            )
    else:
        return Response({"isAuthenticated": False})


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    """
    Handle user registration with validation and approval workflow.

    Creates a new user account with the provided information. Accepts credentials
    from either HTTP Basic Authentication header or request body. Users may require
    admin approval before they can log in, depending on the AUTO_APPROVE_NEW_USERS
    setting.

    Security measures:
    - Validates password strength using Django's password validators
    - Checks for duplicate usernames and emails
    - Automatically logs in the user after successful registration

    Returns:
        201 Created: User created successfully
        400 Bad Request: Validation errors or duplicate data
    """
    # Try to get credentials from Authorization header first
    auth_username, auth_password = parse_basic_auth(request)
    
    data = request.data.copy() if request.data else {}
    
    # Use Basic Auth credentials if available, otherwise use request body
    if auth_username and auth_password:
        data['username'] = auth_username
        data['password'] = auth_password

    # Validate required fields
    required_fields = ["username", "password", "displayName"]
    for field in required_fields:
        if field not in data:
            return Response({"message": f"{field} is required"}, status=400)

    # Check for duplicate username (case-insensitive)
    if Author.objects.filter(username=data["username"]).exists():
        return Response({"message": "Username already exists"}, status=400)

    # Email field removed - no longer checking for duplicates

    # Validate password strength using Django's built-in validators
    try:
        validate_password(data["password"])
    except ValidationError as e:
        return Response({"message": " ".join(e.messages)}, status=400)

    try:
        # Create the author/user with provided information
        author = Author.objects.create_user(
            username=data["username"],
            password=data["password"],
            displayName=data.get("displayName", data["username"]),
            github_username=data.get("github_username", ""),
            # Check if new users should be auto-approved
            is_approved=getattr(settings, "AUTO_APPROVE_NEW_USERS", False),
            is_active=True,
        )

        # Automatically log in the user after successful registration
        login(request, author, backend="django.contrib.auth.backends.ModelBackend")

        # Return the created author data
        serializer = AuthorSerializer(author)
        return Response(
            {
                "success": True,
                "user": serializer.data,
                "message": "Account created successfully",
            },
            status=201,
        )

    except Exception as e:
        return Response({"message": str(e)}, status=400)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """
    Handle user login with authentication and approval checks.

    Authenticates the user credentials using HTTP Basic Authentication from
    Authorization header only. Includes security checks for account approval 
    and session timeout configuration.

    Security features:
    - Validates credentials using Django's authentication backend
    - Checks if user account has been approved by admin
    - Sets session timeout based on "remember me" preference
    - Staff users bypass approval requirements

    Returns:
        200 OK: Login successful with user data
        400 Bad Request: Missing Authorization header with Basic authentication
        401 Unauthorized: Invalid credentials
        403 Forbidden: Account awaiting approval
    """
    # Get credentials from Authorization header only
    username, password = parse_basic_auth(request)
    
    remember_me = request.data.get("remember_me", False)

    if not username or not password:
        return Response({"message": "Authorization header with Basic authentication is required"}, status=400)

    # Authenticate user credentials
    user = authenticate(request, username=username, password=password)

    if user is not None:
        # Check if user account has been approved (staff users bypass this check)
        if not getattr(user, "is_approved", False) and not user.is_staff:
            return Response(
                {"message": "Your account is awaiting admin approval."}, status=403
            )

        # Create session for authenticated user
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")

        # Configure session timeout based on "remember me" preference
        if remember_me:
            # Extended session: 2 weeks
            request.session.set_expiry(1209600)  # 2 weeks in seconds
        else:
            # Standard session: 24 hours
            request.session.set_expiry(86400)  # 24 hours in seconds

        # Debug session information
        print(f"DEBUG: Login successful for user {user.username}")
        print(f"DEBUG: Session key: {request.session.session_key}")
        print(f"DEBUG: Session expiry: {request.session.get_expiry_date()}")
        print(f"DEBUG: User authenticated: {request.user.is_authenticated}")
        print(f"DEBUG: User ID: {request.user.id}")

        # Get the author data to return
        try:
            author = Author.objects.get(id=user.id)
            serializer = AuthorSerializer(author)
            return Response(
                {
                    "success": True,
                    "user": serializer.data,
                    "message": "Login successful",
                }
            )
        except Author.DoesNotExist:
            return Response(
                {
                    "success": True,
                    "user": None,
                    "message": "User exists but author profile not found",
                }
            )
    else:
        # If regular authentication fails, check node authentication
        try:
            node = Node.objects.get(username=username, password=password, is_active=True)
            
            # Node authentication successful - create a superuser/staff Author
            # Check if an Author already exists with this username
            try:
                author = Author.objects.get(username=username)
                # Update existing author to be superuser and staff
                author.is_superuser = True
                author.is_staff = True
                author.is_approved = True
                author.save()
            except Author.DoesNotExist:
                # Create new Author with superuser and staff privileges
                author = Author.objects.create_user(
                    username=username,
                    password=password,
                    displayName=node.name,
                    is_superuser=True,
                    is_staff=True,
                    is_approved=True,
                    is_active=True,
                )

            # Log in the author
            login(request, author, backend="django.contrib.auth.backends.ModelBackend")
            
            # Configure session timeout based on "remember me" preference
            if remember_me:
                # Extended session: 2 weeks
                request.session.set_expiry(1209600)  # 2 weeks in seconds
            else:
                # Standard session: 24 hours
                request.session.set_expiry(86400)  # 24 hours in seconds

            # Debug session information
            print(f"DEBUG: Node authentication successful for {node.name}")
            print(f"DEBUG: Session key: {request.session.session_key}")
            print(f"DEBUG: Session expiry: {request.session.get_expiry_date()}")

            serializer = AuthorSerializer(author)
            return Response(
                {
                    "success": True,
                    "user": serializer.data,
                    "message": "Node authentication successful - superuser access granted",
                }
            )
        except Node.DoesNotExist:
            return Response({"message": "Invalid username or password"}, status=401)


@api_view(["POST"])
@permission_classes([AllowAny])
def github_callback(request):
    """
    Handle GitHub OAuth callback after authentication.

    This endpoint is called after a user successfully authenticates with GitHub
    via django-allauth. It checks the authentication status and returns user data.

    Note: The actual OAuth flow is handled by django-allauth middleware.
    This endpoint just confirms the authentication result.

    Returns:
        200 OK: Authentication status and user data
    """
    code = request.data.get("code")

    if not code:
        return Response({"message": "No authorization code provided"}, status=400)

    # Check if user is authenticated after OAuth flow
    if request.user.is_authenticated:
        try:
            author = Author.objects.get(id=request.user.id)
            serializer = AuthorSerializer(author)
            return Response({"success": True, "user": serializer.data})
        except Author.DoesNotExist:
            return Response(
                {
                    "success": True,
                    "user": None,
                    "message": "User exists but author profile not found",
                }
            )
    else:
        # OAuth flow may still be in progress
        return Response(
            {
                "message": "Authentication status pending, check /api/auth/status/",
                "pendingAuth": True,
            }
        )


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def author_me(request):
    """
    Get or update the current authenticated author's profile information.

    This endpoint provides a convenient way for users to view and update
    their own profile data without needing to know their author ID.

    GET: Returns current user's profile data
    PATCH: Updates current user's profile with provided fields

    Returns:
        200 OK: Current user's profile data
        400 Bad Request: Validation errors on update
        404 Not Found: Author profile not found
    """
    try:
        # Get the current user's author profile
        author = Author.objects.get(id=request.user.id)

        if request.method == "GET":
            serializer = AuthorSerializer(author)
            return Response(serializer.data)

        elif request.method == "PATCH":
            # Update the author profile with provided data
            serializer = AuthorSerializer(author, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                return Response(serializer.errors, status=400)

    except Author.DoesNotExist:
        return Response({"message": "Author profile not found"}, status=404)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Log out the current user and destroy their session.

    Clears the user's session data and authentication state.
    This ensures the user is completely logged out and their session
    cannot be reused.

    Returns:
        200 OK: Logout successful
    """
    logout(request)
    return Response({"success": True})
