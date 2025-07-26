"""
Federation API Views

This module provides API endpoints for centralized federation operations
including syncing remote nodes, posting content, and managing federation data.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from app.models import Node, Entry, Author
from app.utils.federation import FederationService


@api_view(['POST'])
@permission_classes([IsAdminUser])
def sync_all_nodes(request):
    """
    Sync all active nodes with remote content.
    
    This endpoint triggers a full sync of all active nodes,
    fetching both authors and entries from remote nodes.
    """
    try:
        results = FederationService.sync_all_nodes()
        
        # Calculate totals
        total_authors_created = sum(result.get('authors_created', 0) for result in results.values() if isinstance(result, dict))
        total_authors_updated = sum(result.get('authors_updated', 0) for result in results.values() if isinstance(result, dict))
        total_entries_created = sum(result.get('entries_created', 0) for result in results.values() if isinstance(result, dict))
        total_entries_updated = sum(result.get('entries_updated', 0) for result in results.values() if isinstance(result, dict))
        
        return Response({
            'success': True,
            'message': 'Sync completed',
            'results': results,
            'summary': {
                'authors_created': total_authors_created,
                'authors_updated': total_authors_updated,
                'entries_created': total_entries_created,
                'entries_updated': total_entries_updated,
                'nodes_processed': len(results)
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def sync_node(request):
    """
    Sync a specific node with remote content.
    
    Request body:
    {
        "node_id": "uuid",
        "authors_only": false,
        "entries_only": false,
        "limit": 50
    }
    """
    try:
        node_id = request.data.get('node_id')
        authors_only = request.data.get('authors_only', False)
        entries_only = request.data.get('entries_only', False)
        limit = request.data.get('limit', 50)
        
        if not node_id:
            return Response({
                'success': False,
                'error': 'node_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            node = Node.objects.get(id=node_id, is_active=True)
        except Node.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Node not found or not active'
            }, status=status.HTTP_404_NOT_FOUND)
        
        results = {}
        
        if not entries_only:
            # Sync authors
            authors_created, authors_updated = FederationService.sync_remote_authors(node, limit)
            results['authors'] = {
                'created': authors_created,
                'updated': authors_updated
            }
        
        if not authors_only:
            # Sync entries
            entries_created, entries_updated = FederationService.sync_remote_entries(node, limit)
            results['entries'] = {
                'created': entries_created,
                'updated': entries_updated
            }
        
        return Response({
            'success': True,
            'message': f'Sync completed for {node.name}',
            'node': {
                'id': node.id,
                'name': node.name,
                'host': node.host
            },
            'results': results
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def post_local_entries(request):
    """
    Post local entries to remote nodes.
    
    This endpoint sends recent local entries to all relevant remote nodes
    based on their visibility settings.
    """
    try:
        # Get recent local entries that should be federated
        recent_entries = Entry.objects.filter(
            author__node__isnull=True,  # Local authors only
            visibility__in=[Entry.PUBLIC, Entry.FRIENDS_ONLY],
            created_at__gte=timezone.now() - timedelta(days=7)  # Last 7 days
        ).order_by('-created_at')
        
        total_entries = recent_entries.count()
        posted_count = 0
        failed_count = 0
        results = {}
        
        for entry in recent_entries:
            try:
                entry_results = FederationService.post_entry_to_remote_nodes(entry)
                successful_nodes = [name for name, success in entry_results.items() if success]
                failed_nodes = [name for name, success in entry_results.items() if not success]
                
                results[entry.id] = {
                    'title': entry.title,
                    'author': entry.author.username,
                    'visibility': entry.visibility,
                    'successful_nodes': successful_nodes,
                    'failed_nodes': failed_nodes
                }
                
                if successful_nodes:
                    posted_count += 1
                if failed_nodes:
                    failed_count += 1
                    
            except Exception as e:
                results[entry.id] = {
                    'title': entry.title,
                    'author': entry.author.username,
                    'error': str(e)
                }
                failed_count += 1
        
        return Response({
            'success': True,
            'message': 'Posting completed',
            'summary': {
                'total_entries': total_entries,
                'posted_successfully': posted_count,
                'failed': failed_count
            },
            'results': results
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def federation_status(request):
    """
    Get federation status and statistics.
    
    Returns information about connected nodes, sync status,
    and federation statistics.
    """
    try:
        # Get node statistics
        total_nodes = Node.objects.count()
        active_nodes = Node.objects.filter(is_active=True).count()
        
        # Get author statistics
        total_authors = Author.objects.count()
        local_authors = Author.objects.filter(node__isnull=True).count()
        remote_authors = Author.objects.filter(node__isnull=False).count()
        
        # Get entry statistics
        total_entries = Entry.objects.count()
        local_entries = Entry.objects.filter(author__node__isnull=True).count()
        remote_entries = Entry.objects.filter(author__node__isnull=False).count()
        
        # Get recent activity
        recent_entries = Entry.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        recent_remote_entries = Entry.objects.filter(
            author__node__isnull=False,
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        # Get node details
        nodes = []
        for node in Node.objects.all():
            node_authors = Author.objects.filter(node=node).count()
            node_entries = Entry.objects.filter(author__node=node).count()
            
            nodes.append({
                'id': node.id,
                'name': node.name,
                'host': node.host,
                'is_active': node.is_active,
                'authors_count': node_authors,
                'entries_count': node_entries
            })
        
        return Response({
            'success': True,
            'federation_status': {
                'nodes': {
                    'total': total_nodes,
                    'active': active_nodes,
                    'details': nodes
                },
                'authors': {
                    'total': total_authors,
                    'local': local_authors,
                    'remote': remote_authors
                },
                'entries': {
                    'total': total_entries,
                    'local': local_entries,
                    'remote': remote_entries,
                    'recent_total': recent_entries,
                    'recent_remote': recent_remote_entries
                }
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def test_node_connection(request):
    """
    Test connection to a specific node.
    
    Request body:
    {
        "node_id": "uuid"
    }
    """
    try:
        node_id = request.data.get('node_id')
        
        if not node_id:
            return Response({
                'success': False,
                'error': 'node_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            node = Node.objects.get(id=node_id)
        except Node.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Node not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Test connection by fetching authors
        try:
            authors = FederationService.fetch_remote_authors(node, limit=5)
            entries = FederationService.fetch_remote_entries(node, limit=5)
            
            return Response({
                'success': True,
                'message': 'Connection successful',
                'node': {
                    'id': node.id,
                    'name': node.name,
                    'host': node.host,
                    'is_active': node.is_active
                },
                'test_results': {
                    'authors_fetched': len(authors),
                    'entries_fetched': len(entries),
                    'connection_status': 'success'
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Connection failed',
                'node': {
                    'id': node.id,
                    'name': node.name,
                    'host': node.host,
                    'is_active': node.is_active
                },
                'test_results': {
                    'connection_status': 'failed',
                    'error': str(e)
                }
            }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 