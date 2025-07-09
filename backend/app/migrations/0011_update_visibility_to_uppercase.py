# Data migration to update visibility values to uppercase

from django.db import migrations


def update_visibility_to_uppercase(apps, schema_editor):
    """Update existing visibility values from lowercase to uppercase"""
    Entry = apps.get_model('app', 'Entry')
    
    # Update all entries with lowercase visibility values
    Entry.objects.filter(visibility='public').update(visibility='PUBLIC')
    Entry.objects.filter(visibility='unlisted').update(visibility='UNLISTED')
    Entry.objects.filter(visibility='friends').update(visibility='FRIENDS')
    Entry.objects.filter(visibility='deleted').update(visibility='DELETED')


def reverse_visibility_to_lowercase(apps, schema_editor):
    """Reverse migration - convert back to lowercase"""
    Entry = apps.get_model('app', 'Entry')
    
    # Update all entries with uppercase visibility values
    Entry.objects.filter(visibility='PUBLIC').update(visibility='public')
    Entry.objects.filter(visibility='UNLISTED').update(visibility='unlisted')
    Entry.objects.filter(visibility='FRIENDS').update(visibility='friends')
    Entry.objects.filter(visibility='DELETED').update(visibility='deleted')


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0010_add_project_spec_fields'),
    ]

    operations = [
        migrations.RunPython(
            update_visibility_to_uppercase,
            reverse_visibility_to_lowercase
        ),
    ]