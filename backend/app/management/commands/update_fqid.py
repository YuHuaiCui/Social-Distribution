from django.core.management.base import BaseCommand
from app.models import Entry, Author

class Command(BaseCommand):
    help = "Remove trailing slashes from FQIDs and set fqid field for all remote entries"

    def handle(self, *args, **kwargs):
        # Fix author URLs with trailing slashes
        authors_with_slash = Author.objects.filter(url__endswith='/')
        author_count = authors_with_slash.count()
        
        self.stdout.write(f"Processing {author_count} authors with trailing slashes...")
        
        author_updated = 0
        for author in authors_with_slash:
            old_url = author.url
            new_url = old_url.rstrip('/')
            author.url = new_url
            author.save(update_fields=['url'])
            author_updated += 1
            self.stdout.write(f"Updated author {author.username}: {old_url} -> {new_url}")
        
        self.stdout.write(self.style.SUCCESS(f">>> Updated {author_updated} authors to remove trailing slashes."))
        
        # Fix host URLs with missing trailing slashes (they should have trailing slashes)
        authors_missing_host_slash = Author.objects.filter(host__isnull=False).exclude(host__endswith='/')
        host_count = authors_missing_host_slash.count()
        
        self.stdout.write(f"Processing {host_count} authors with host URLs missing trailing slashes...")
        
        host_updated = 0
        for author in authors_missing_host_slash:
            old_host = author.host
            new_host = old_host + '/'
            author.host = new_host
            author.save(update_fields=['host'])
            host_updated += 1
            self.stdout.write(f"Updated author {author.username} host: {old_host} -> {new_host}")
        
        self.stdout.write(self.style.SUCCESS(f">>> Updated {host_updated} authors to add trailing slashes to host URLs."))
        
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