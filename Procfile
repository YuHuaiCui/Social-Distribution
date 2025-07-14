release: cd backend && DJANGO_SETTINGS_MODULE=project.settings_heroku python manage.py migrate
web: cd backend && DJANGO_SETTINGS_MODULE=project.settings_heroku gunicorn project.wsgi --log-file -