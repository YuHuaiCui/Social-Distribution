# Generated manually to add missing categories field

from django.db import migrations, models


def add_categories_safely(apps, schema_editor):
    """Add categories column if it doesn't exist"""
    db_alias = schema_editor.connection.alias
    
    with schema_editor.connection.cursor() as cursor:
        # Check if column exists in a database-agnostic way
        if schema_editor.connection.vendor == 'sqlite':
            cursor.execute("PRAGMA table_info(app_entry);")
            columns = [row[1] for row in cursor.fetchall()]
        elif schema_editor.connection.vendor == 'postgresql':
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'app_entry' AND column_name = 'categories';
            """)
            columns = [row[0] for row in cursor.fetchall()]
        else:
            # For other databases, try a generic approach
            try:
                cursor.execute("SELECT categories FROM app_entry LIMIT 1;")
                columns = ['categories']  # Column exists
            except:
                columns = []  # Column doesn't exist
        
        if 'categories' not in columns:
            # Add the column with default empty JSON array
            if schema_editor.connection.vendor == 'postgresql':
                cursor.execute("ALTER TABLE app_entry ADD COLUMN categories JSONB DEFAULT '[]'::jsonb;")
            else:
                cursor.execute("ALTER TABLE app_entry ADD COLUMN categories TEXT DEFAULT '[]';")


def remove_categories_safely(apps, schema_editor):
    """Remove categories column"""
    with schema_editor.connection.cursor() as cursor:
        if schema_editor.connection.vendor != 'sqlite':
            # Most databases support DROP COLUMN
            cursor.execute("ALTER TABLE app_entry DROP COLUMN IF EXISTS categories;")
        # SQLite doesn't support DROP COLUMN, so this is a no-op for SQLite


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0014_alter_savedentry_author_alter_savedentry_entry'),
    ]

    operations = [
        # First add the physical column to the database
        migrations.RunPython(
            add_categories_safely,
            remove_categories_safely
        ),
        # Then tell Django about the model field
        migrations.AddField(
            model_name='entry',
            name='categories',
            field=models.JSONField(blank=True, default=list, help_text='List of categories this entry belongs to'),
        ),
    ] 