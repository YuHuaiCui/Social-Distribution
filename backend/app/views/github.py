import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


class GitHubValidationView(APIView):
    """
    API endpoint for validating GitHub usernames and fetching activity.
    """
    permission_classes = [permissions.AllowAny]  # Public API

    def get(self, request, username):
        """
        Validate if a GitHub username exists and fetch basic info.
        
        Args:
            request: HTTP request
            username: GitHub username to validate
            
        Returns:
            Response with validation status and user info if valid
        """
        # Check cache first
        cache_key = f"github_user_{username}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        try:
            # Use GitHub API to validate username
            headers = {
                'Accept': 'application/vnd.github.v3+json',
            }
            
            # Add auth token if available for higher rate limits
            github_token = getattr(settings, 'GITHUB_API_TOKEN', None)
            if github_token:
                headers['Authorization'] = f'token {github_token}'

            response = requests.get(
                f'https://api.github.com/users/{username}',
                headers=headers,
                timeout=5
            )

            if response.status_code == 200:
                user_data = response.json()
                result = {
                    'valid': True,
                    'username': user_data.get('login'),
                    'name': user_data.get('name'),
                    'avatar_url': user_data.get('avatar_url'),
                    'public_repos': user_data.get('public_repos'),
                    'followers': user_data.get('followers'),
                    'following': user_data.get('following'),
                    'created_at': user_data.get('created_at'),
                    'html_url': user_data.get('html_url'),
                }
                # Cache for 1 hour
                cache.set(cache_key, result, 3600)
                return Response(result)
            elif response.status_code == 404:
                result = {'valid': False, 'error': 'User not found'}
                # Cache negative result for 5 minutes
                cache.set(cache_key, result, 300)
                return Response(result, status=status.HTTP_404_NOT_FOUND)
            else:
                logger.error(f"GitHub API error: {response.status_code}")
                return Response(
                    {'error': 'GitHub API error'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        except requests.Timeout:
            return Response(
                {'error': 'GitHub API timeout'},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        except Exception as e:
            logger.error(f"Error validating GitHub username: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GitHubActivityView(APIView):
    """
    API endpoint for fetching GitHub activity data.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        """
        Fetch GitHub activity for a user including commits and contributions.
        
        Args:
            request: HTTP request
            username: GitHub username
            
        Returns:
            Response with GitHub activity data
        """
        # Check cache first
        cache_key = f"github_activity_{username}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        try:
            headers = {
                'Accept': 'application/vnd.github.v3+json',
            }
            
            github_token = getattr(settings, 'GITHUB_API_TOKEN', None)
            if github_token:
                headers['Authorization'] = f'token {github_token}'

            # Fetch recent events
            events_response = requests.get(
                f'https://api.github.com/users/{username}/events/public',
                headers=headers,
                params={'per_page': 30},
                timeout=5
            )

            if events_response.status_code != 200:
                return Response(
                    {'error': 'Failed to fetch GitHub activity'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            events = events_response.json()
            
            # Process events into activities
            activities = []
            for event in events[:20]:  # Limit to 20 most recent
                activity = None
                
                if event['type'] == 'PushEvent':
                    for commit in event['payload'].get('commits', [])[:3]:
                        activity = {
                            'id': commit['sha'][:7],
                            'type': 'commit',
                            'title': commit['message'].split('\n')[0],
                            'repo': event['repo']['name'],
                            'date': event['created_at'],
                            'url': commit['url'].replace('api.github.com/repos', 'github.com').replace('/commits/', '/commit/'),
                        }
                        activities.append(activity)
                elif event['type'] == 'PullRequestEvent':
                    pr = event['payload']['pull_request']
                    activity = {
                        'id': str(pr['id']),
                        'type': 'pull_request',
                        'title': pr['title'],
                        'repo': event['repo']['name'],
                        'date': event['created_at'],
                        'url': pr['html_url'],
                    }
                    activities.append(activity)
                elif event['type'] == 'IssuesEvent':
                    issue = event['payload']['issue']
                    activity = {
                        'id': str(issue['id']),
                        'type': 'issue',
                        'title': issue['title'],
                        'repo': event['repo']['name'],
                        'date': event['created_at'],
                        'url': issue['html_url'],
                    }
                    activities.append(activity)

            # For contribution heatmap, we'd need to scrape or use GraphQL API
            # For now, return a simplified response
            result = {
                'username': username,
                'activities': activities[:15],  # Limit final output
                'contributions': {
                    'total': len(activities),
                    'message': 'Detailed contribution graph requires GitHub GraphQL API'
                }
            }

            # Cache for 30 minutes
            cache.set(cache_key, result, 1800)
            return Response(result)

        except requests.Timeout:
            return Response(
                {'error': 'GitHub API timeout'},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        except Exception as e:
            logger.error(f"Error fetching GitHub activity: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )