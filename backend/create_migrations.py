#!/usr/bin/env python3
"""
Script to create migration files for the model changes.
Run this in the backend directory after activating the virtual environment.
"""

print("""
To create migrations for the model changes, run these commands:

1. First, activate your virtual environment (if you have one):
   - If using venv: source venv/bin/activate
   - If using conda: conda activate your_env_name

2. Then run:
   python manage.py makemigrations

3. Review the migration files created in app/migrations/

4. Apply the migrations:
   python manage.py migrate

The migrations will add these new fields:
- Entry model: type, web, published, description
- Author model: type, host, web

Note: The visibility field values will also be updated from lowercase to uppercase.
You may need to create a data migration to update existing records.
""")