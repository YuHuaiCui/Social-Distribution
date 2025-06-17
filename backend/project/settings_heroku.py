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
    os.environ.get('HEROKU_APP_NAME', '') + '.herokuapp.com',
]

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