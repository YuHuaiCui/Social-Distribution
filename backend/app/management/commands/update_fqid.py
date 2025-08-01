from django.core.management.base import BaseCommand
from app.models import Entry, Author

class Command(BaseCommand):
    help = "Set fqid field for all remote entries (database migration for trailing slashes disabled due to foreign key constraints)"

    def handle(self, *args, **kwargs):
        # NOTE: Database migration for author URLs is disabled due to foreign key constraints
        # The serializer has been updated to handle trailing slashes automatically
        authors_with_slash = Author.objects.filter(url__endswith='/')
        author_count = authors_with_slash.count()
        
        if author_count > 0:
            self.stdout.write(f"Found {author_count} authors with trailing slashes in database.")
            self.stdout.write("Database migration skipped due to foreign key constraints.")
            self.stdout.write("The serializer automatically handles trailing slash removal in API responses.")
        else:
            self.stdout.write("No authors with trailing slashes found.")
        
        # Original fqid logic for entries
        updated = 0
        entries = Entry.objects.filter(author__node__isnull=False, fqid__isnull=True)
        total = entries.count()

        self.stdout.write(f"Processing {total} remote entries...")

        for entry in entries:
            entry.fqid = entry.url
            entry.save()
            updated += 1

        self.stdout.write(self.style.SUCCESS(f">>> Updated {updated} entries with fqid."))