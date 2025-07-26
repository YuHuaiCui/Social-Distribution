"""
Django management command for syncing federation data.

This command provides various options for syncing data with remote nodes:
- Sync all nodes
- Sync specific node
- Sync only authors
- Sync only entries
- Post local entries to remote nodes
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from app.models import Node, Entry
from app.utils.federation import FederationService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync federation data with remote nodes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--node',
            type=str,
            help='Sync only a specific node by name or host',
        )
        parser.add_argument(
            '--authors-only',
            action='store_true',
            help='Sync only authors, not entries',
        )
        parser.add_argument(
            '--entries-only',
            action='store_true',
            help='Sync only entries, not authors',
        )
        parser.add_argument(
            '--post-local',
            action='store_true',
            help='Post local entries to remote nodes',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Maximum number of items to sync per node (default: 50)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be synced without actually doing it',
        )

    def handle(self, *args, **options):
        if options['dry_run']:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        if options['post_local']:
            self._post_local_entries(options)
        elif options['node']:
            self._sync_specific_node(options)
        else:
            self._sync_all_nodes(options)

    def _sync_all_nodes(self, options):
        """Sync all active nodes."""
        self.stdout.write('Syncing all active nodes...')
        
        if options['dry_run']:
            active_nodes = Node.objects.filter(is_active=True)
            self.stdout.write(f'Would sync {active_nodes.count()} nodes')
            for node in active_nodes:
                self.stdout.write(f'  - {node.name} ({node.host})')
            return
        
        results = FederationService.sync_all_nodes()
        
        total_authors_created = 0
        total_authors_updated = 0
        total_entries_created = 0
        total_entries_updated = 0
        
        for node_name, result in results.items():
            if 'error' in result:
                self.stdout.write(
                    self.style.ERROR(f'❌ {node_name}: {result["error"]}')
                )
            else:
                authors_created = result.get('authors_created', 0)
                authors_updated = result.get('authors_updated', 0)
                entries_created = result.get('entries_created', 0)
                entries_updated = result.get('entries_updated', 0)
                
                total_authors_created += authors_created
                total_authors_updated += authors_updated
                total_entries_created += entries_created
                total_entries_updated += entries_updated
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ {node_name}: '
                        f'{authors_created} authors created, {authors_updated} updated; '
                        f'{entries_created} entries created, {entries_updated} updated'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n📊 Total: '
                f'{total_authors_created} authors created, {total_authors_updated} updated; '
                f'{total_entries_created} entries created, {total_entries_updated} updated'
            )
        )

    def _sync_specific_node(self, options):
        """Sync a specific node."""
        node_identifier = options['node']
        
        # Try to find the node by name or host
        try:
            node = Node.objects.get(
                models.Q(name__icontains=node_identifier) |
                models.Q(host__icontains=node_identifier),
                is_active=True
            )
        except Node.DoesNotExist:
            raise CommandError(f'No active node found matching "{node_identifier}"')
        except Node.MultipleObjectsReturned:
            raise CommandError(f'Multiple nodes found matching "{node_identifier}"')
        
        self.stdout.write(f'Syncing node: {node.name} ({node.host})')
        
        if options['dry_run']:
            self.stdout.write(f'Would sync node {node.name} with limit {options["limit"]}')
            return
        
        try:
            if not options['entries_only']:
                # Sync authors
                authors_created, authors_updated = FederationService.sync_remote_authors(
                    node, options['limit']
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Authors: {authors_created} created, {authors_updated} updated'
                    )
                )
            
            if not options['authors_only']:
                # Sync entries
                entries_created, entries_updated = FederationService.sync_remote_entries(
                    node, options['limit']
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Entries: {entries_created} created, {entries_updated} updated'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Failed to sync node {node.name}: {e}')
            )

    def _post_local_entries(self, options):
        """Post local entries to remote nodes."""
        self.stdout.write('Posting local entries to remote nodes...')
        
        # Get recent local entries that should be federated
        recent_entries = Entry.objects.filter(
            author__node__isnull=True,  # Local authors only
            visibility__in=[Entry.PUBLIC, Entry.FRIENDS_ONLY],
            created_at__gte=timezone.now() - timedelta(days=7)  # Last 7 days
        ).order_by('-created_at')
        
        if options['dry_run']:
            self.stdout.write(f'Would post {recent_entries.count()} local entries to remote nodes')
            for entry in recent_entries[:5]:  # Show first 5
                self.stdout.write(f'  - {entry.title} by {entry.author.username} ({entry.visibility})')
            return
        
        posted_count = 0
        failed_count = 0
        
        for entry in recent_entries:
            try:
                results = FederationService.post_entry_to_remote_nodes(entry)
                successful_nodes = [name for name, success in results.items() if success]
                failed_nodes = [name for name, success in results.items() if not success]
                
                if successful_nodes:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✅ Posted "{entry.title}" to {len(successful_nodes)} nodes: {", ".join(successful_nodes)}'
                        )
                    )
                    posted_count += 1
                
                if failed_nodes:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠️  Failed to post "{entry.title}" to {len(failed_nodes)} nodes: {", ".join(failed_nodes)}'
                        )
                    )
                    failed_count += 1
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Failed to post "{entry.title}": {e}')
                )
                failed_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n📊 Posted {posted_count} entries successfully, {failed_count} failed'
            )
        )


# Import models here to avoid circular imports
from django.db import models
from django.utils import timezone
from datetime import timedelta 