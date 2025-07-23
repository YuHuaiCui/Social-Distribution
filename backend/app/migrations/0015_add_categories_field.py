# Generated manually to add missing categories field

from django.db import migrations, models


def add_categories_safely(apps, schema_editor):
    """Add categories column if it doesn't exist"""
    with schema_editor.connection.cursor() as cursor:
        # Check if column exists in SQLite
        cursor.execute("PRAGMA table_info(app_entry);")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'categories' not in columns:
            # Add the column with default empty JSON array
            cursor.execute("ALTER TABLE app_entry ADD COLUMN categories TEXT DEFAULT '[]';")


def remove_categories_safely(apps, schema_editor):
    """Remove categories column (SQLite limitation - this is mainly for documentation)"""
    # SQLite doesn't support DROP COLUMN, so this is a no-op
    pass


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