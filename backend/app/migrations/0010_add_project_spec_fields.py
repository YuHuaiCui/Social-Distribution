# Generated migration for adding project spec compliance fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0009_entry_image_data'),
    ]

    operations = [
        # Add new fields to Entry model
        migrations.AddField(
            model_name='entry',
            name='type',
            field=models.CharField(default='entry', help_text="Object type for federation (always 'entry')", max_length=20),
        ),
        migrations.AddField(
            model_name='entry',
            name='web',
            field=models.URLField(blank=True, help_text='Frontend URL where this entry can be viewed'),
        ),
        migrations.AddField(
            model_name='entry',
            name='published',
            field=models.DateTimeField(blank=True, help_text='ISO 8601 timestamp of when the entry was published', null=True),
        ),
        migrations.AddField(
            model_name='entry',
            name='description',
            field=models.TextField(blank=True, help_text='Brief description of the entry for preview purposes'),
        ),
        migrations.AddField(
            model_name='entry',
            name='categories',
            field=models.JSONField(default=list, blank=True, help_text='List of categories this entry belongs to'),
        ),
        
        # Add new fields to Author model
        migrations.AddField(
            model_name='author',
            name='type',
            field=models.CharField(default='author', help_text="Object type for federation (always 'author')", max_length=20),
        ),
        migrations.AddField(
            model_name='author',
            name='host',
            field=models.URLField(blank=True, help_text="API host URL for this author's node"),
        ),
        migrations.AddField(
            model_name='author',
            name='web',
            field=models.URLField(blank=True, help_text="Frontend URL where this author's profile can be viewed"),
        ),
        
        # Update visibility choices to uppercase
        migrations.AlterField(
            model_name='entry',
            name='visibility',
            field=models.CharField(
                choices=[
                    ('PUBLIC', 'Public'),
                    ('UNLISTED', 'Unlisted'),
                    ('FRIENDS', 'Friends Only'),
                    ('DELETED', 'Deleted')
                ],
                default='PUBLIC',
                max_length=20
            ),
        ),
    ]