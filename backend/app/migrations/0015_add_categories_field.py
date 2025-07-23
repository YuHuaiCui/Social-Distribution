# Generated manually to add missing categories field

from django.db import migrations, models


# Generated manually to add missing categories field

from django.db import migrations, models


def add_categories_column_if_missing(apps, schema_editor):
    """Safely add categories column only if it doesn't exist"""
    table_name = "app_entry"
    
    with schema_editor.connection.cursor() as cursor:
        # Check if column exists using database-specific queries
        column_exists = False
        
        if schema_editor.connection.vendor == 'postgresql':
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = %s AND column_name = %s
                );
            """, [table_name, 'categories'])
            column_exists = cursor.fetchone()[0]
            
        elif schema_editor.connection.vendor == 'sqlite':
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = [row[1] for row in cursor.fetchall()]
            column_exists = 'categories' in columns
            
        else:
            # Generic fallback - try to query the column
            try:
                cursor.execute(f"SELECT categories FROM {table_name} LIMIT 1;")
                column_exists = True
            except Exception:
                column_exists = False
        
        # Only add column if it doesn't exist
        if not column_exists:
            if schema_editor.connection.vendor == 'postgresql':
                cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN categories JSONB DEFAULT '[]'::jsonb;")
            else:
                cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN categories TEXT DEFAULT '[]';")


def remove_categories_column_if_exists(apps, schema_editor):
    """Safely remove categories column if it exists (reverse operation)"""
    table_name = "app_entry"
    
    # Only attempt to remove if not SQLite (which doesn't support DROP COLUMN easily)
    if schema_editor.connection.vendor != 'sqlite':
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(f"ALTER TABLE {table_name} DROP COLUMN IF EXISTS categories;")


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0014_alter_savedentry_author_alter_savedentry_entry'),
    ]

    operations = [
        # Separate database and state operations to handle existing columns gracefully
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    add_categories_column_if_missing,
                    remove_categories_column_if_exists,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='entry',
                    name='categories',
                    field=models.JSONField(blank=True, default=list, help_text='List of categories this entry belongs to'),
                ),
            ]
        ),
    ] 