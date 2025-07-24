"""
Heroku production settings
"""
import os
import dj_database_url
from .settings import *


# Security
DEBUG = False
ALLOWED_HOSTS = [
    '.herokuapp.com',
    'project-black-ej-53285e19ae0a.herokuapp.com',
    'cmp404-black-prod-melrita-66c4dd1f85d5.herokuapp.com',
    's25-black-yangwang-4d3e16ddc539.herokuapp.com',
    os.environ.get('HEROKU_APP_NAME', '') + '.herokuapp.com',
]

# CORS settings for production
CORS_ALLOWED_ORIGINS = [
    "https://s25-black-dev-962e55a69a4c.herokuapp.com",
    "http://s25-black-dev-962e55a69a4c.herokuapp.com",
    "https://project-black-ej-53285e19ae0a.herokuapp.com",
    "http://project-black-ej-53285e19ae0a.herokuapp.com",
    "https://s25-black-yangwang-4d3e16ddc539.herokuapp.com",
    "http://s25-black-yangwang-4d3e16ddc539.herokuapp.com"
]

# Allow the app's own domain
if os.environ.get('HEROKU_APP_NAME'):
    CORS_ALLOWED_ORIGINS.extend([
        f"https://{os.environ.get('HEROKU_APP_NAME')}.herokuapp.com",
        f"http://{os.environ.get('HEROKU_APP_NAME')}.herokuapp.com",
    ])

# Database
DATABASES = {
    'default': dj_database_url.config(
        conn_max_age=600,
        ssl_require=True
    )
}

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Whitenoise for static files
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Serve index.html for React app
WHITENOISE_INDEX_FILE = True
WHITENOISE_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Add template directory for serving index.html
TEMPLATES[0]['DIRS'].append(os.path.join(BASE_DIR, 'staticfiles'))

# Security settings for production
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# Production CSP Configuration (more restrictive)
CSP_DEFAULT_SRC = ["'self'",]
CSP_SCRIPT_SRC = [
    "'self'",
    "https://github.githubassets.com",
    "https://cdn.jsdelivr.net",
]
CSP_STYLE_SRC = [
    "'self'",
    "'unsafe-inline'",  # Required for inline styles
    "https://github.githubassets.com",
    "https://fonts.googleapis.com",
]
CSP_FONT_SRC = [
    "'self'",
    "https://fonts.gstatic.com",
    "https://github.githubassets.com",
]
CSP_IMG_SRC = [
    "'self'",
    "data:",
    "https:",
]
CSP_CONNECT_SRC = [
    "'self'",
    "https://api.github.com",
    "https://github.com",
]
CSP_FRAME_SRC = [
    "'self'",
    "https://github.com",
]
CSP_MEDIA_SRC = ["'self'",]
CSP_OBJECT_SRC = ["'none'",]
CSP_BASE_URI = ["'self'",]
CSP_FORM_ACTION = ["'self'",]

# Use nonces in production instead of unsafe-inline
CSP_INCLUDE_NONCE_IN = ["script-src"]