from django.core.management.base import BaseCommand
from app.models import Entry

class Command(BaseCommand):
    help = "Set fqid field for all remote entries"

    def handle(self, *args, **kwargs):
        updated = 0
        entries = Entry.objects.filter(author__node__isnull=False, fqid__isnull=True)
        total = entries.count()

        self.stdout.write(f"Processing {total} remote entries...")

        for entry in entries:
            entry.fqid = entry.url
            entry.save()
            updated += 1

        self.stdout.write(self.style.SUCCESS(f">>> Updated {updated} entries with fqid."))