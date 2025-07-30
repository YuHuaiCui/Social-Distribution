from urllib.parse import quote, unquote


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