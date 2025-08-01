"""
URL utilities for encoding, decoding, parsing, and validation.
"""

from urllib.parse import quote, unquote, urlparse, urljoin
import re
import uuid


def percent_encode_url(url):
    """
    Percent encode a URL, encoding all special characters.
    
    Args:
        url (str): URL to encode
    
    Returns:
        str: Percent-encoded URL
    """
    return quote(url, safe='')


def percent_decode_url(url):
    """
    Percent decode a URL.
    
    Args:
        url (str): URL to decode
    
    Returns:
        str: Percent-decoded URL
    """
    return unquote(url)


def get_base_host(url):
    """
    Extract the base host URL from a given URL.
    
    Args:
        url (str): The URL to parse
        
    Returns:
        str: The base host URL (e.g., "http://example.com" from "http://example.com/api/authors/")
    """
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def get_api_base_url(url):
    """
    Extract the API base URL from a given URL.
    
    Args:
        url (str): The URL to parse
        
    Returns:
        str: The API base URL (e.g., "http://example.com/api/" from "http://example.com/api/authors/")
    """
    parsed = urlparse(url)
    path_parts = parsed.path.strip('/').split('/')
    
    # Find the 'api' part in the path
    if 'api' in path_parts:
        api_index = path_parts.index('api')
        api_path = '/'.join(path_parts[:api_index + 1])
        return f"{parsed.scheme}://{parsed.netloc}/{api_path}/"
    
    # If no 'api' found, assume the base URL is the API base
    return f"{parsed.scheme}://{parsed.netloc}/"


def is_valid_url(url):
    """
    Check if a URL is valid.
    
    Args:
        url (str): The URL to validate
        
    Returns:
        bool: True if the URL is valid, False otherwise
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def normalize_url(url):
    """
    Normalize a URL by ensuring it has a trailing slash if it's a directory.
    
    Args:
        url (str): The URL to normalize
        
    Returns:
        str: The normalized URL
    """
    if not url.endswith('/'):
        return url + '/'
    return url


def normalize_author_url(url):
    """
    Normalize an author URL to prevent integrity errors.
    
    This function ensures consistent URL formatting across different remote nodes
    by standardizing the format to prevent duplicate key violations.
    
    Args:
        url (str): The author URL to normalize
        
    Returns:
        str: The normalized URL
    """
    if not url:
        return url
    
    # Parse the URL
    parsed = urlparse(url)
    
    # Reconstruct with consistent formatting
    # - Lowercase scheme and hostname
    # - Remove default ports (80 for http, 443 for https)
    # - Ensure trailing slash for directory-like paths
    scheme = parsed.scheme.lower()
    hostname = parsed.hostname.lower() if parsed.hostname else ''
    
    # Handle port normalization
    port = parsed.port
    if port and ((scheme == 'http' and port == 80) or (scheme == 'https' and port == 443)):
        port = None
    
    # Reconstruct netloc
    if port:
        netloc = f"{hostname}:{port}"
    else:
        netloc = hostname
    
    # Add username:password if present
    if parsed.username:
        if parsed.password:
            netloc = f"{parsed.username}:{parsed.password}@{netloc}"
        else:
            netloc = f"{parsed.username}@{netloc}"
    
    # Normalize path - remove trailing slash for author URLs
    path = parsed.path.rstrip('/')
    if not path:
        path = ''
    
    # Reconstruct the URL
    normalized = f"{scheme}://{netloc}{path}"
    
    # Add query and fragment if they exist
    if parsed.query:
        normalized += f"?{parsed.query}"
    if parsed.fragment:
        normalized += f"#{parsed.fragment}"
    
    return normalized


def join_urls(base_url, path):
    """
    Join a base URL with a path.
    
    Args:
        base_url (str): The base URL
        path (str): The path to join
        
    Returns:
        str: The joined URL
    """
    return urljoin(normalize_url(base_url), path.lstrip('/'))


def parse_uuid_from_url(url):
    """
    Extract a UUID from a URL.
    
    This function searches for a valid UUID pattern in the URL and returns the last one found.
    This is important for URLs like /authors/{author_uuid}/entries/{entry_uuid} where we 
    want the entry UUID, not the author UUID.
    
    Args:
        url (str): The URL containing a UUID
        
    Returns:
        str: The extracted UUID string, or None if no valid UUID found
        
    Examples:
        >>> parse_uuid_from_url("http://example.com/api/authors/123e4567-e89b-12d3-a456-426614174000/")
        '123e4567-e89b-12d3-a456-426614174000'
        >>> parse_uuid_from_url("http://example.com/authors/123e4567-e89b-12d3-a456-426614174000/entries/550e8400-e29b-41d4-a716-446655440000")
        '550e8400-e29b-41d4-a716-446655440000'
    """
    if not url:
        return None
        
    # UUID regex pattern
    uuid_pattern = r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
    
    # Find all UUIDs in the URL and return the last one
    matches = re.findall(uuid_pattern, url)
    
    if matches:
        # Validate the last UUID found is a proper UUID
        try:
            uuid.UUID(matches[-1])
            return matches[-1]
        except ValueError:
            return None
    
    return None