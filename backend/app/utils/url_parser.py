"""
URL parsing utilities for node-to-node communication.
"""

from urllib.parse import urlparse, urljoin


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