from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from app.models import Author, Node, Entry, Comment, Like, Follow, Friendship, Inbox


@admin.register(Author)
class AuthorAdmin(UserAdmin):
    """Admin configuration for Author model"""

    list_display = [
        "username",
        "email",
        "displayName",
        "is_local_display",
        "is_approved",
        "is_active",
        "is_staff",
        "node",
        "type",
        "created_at",
    ]
    list_filter = [
        "is_approved",
        "is_active",
        "is_staff",
        "is_superuser",
        "node",
        "type",
        "created_at",
        "updated_at",
    ]
    search_fields = ["username", "email", "displayName", "github_username", "url", "host", "web"]
    ordering = ["-created_at"]

    # Completely override fieldsets to include all Author-specific fields
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            "Personal Info",
            {
                "fields": (
                    "first_name",
                    "last_name", 
                    "email",
                    "displayName",
                    "github_username",
                    "profileImage",
                )
            },
        ),
        (
            "Federation & URLs",
            {
                "fields": (
                    "id",
                    "url", 
                    "type",
                    "host",
                    "web",
                    "node",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_approved",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (
            "Important dates",
            {
                "fields": ("last_login", "date_joined", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    readonly_fields = ["id", "url", "created_at", "updated_at", "date_joined"]
    
    def is_local_display(self, obj):
        """Display whether author is local or remote"""
        return "Local" if obj.is_local else "Remote"
    is_local_display.short_description = "Type"
    is_local_display.admin_order_field = "node"

    actions = ["approve_authors", "deactivate_authors"]

    def approve_authors(self, request, queryset):
        updated = queryset.update(is_approved=True)
        self.message_user(request, f"{updated} authors were approved.")

    approve_authors.short_description = "Approve selected authors"

    def deactivate_authors(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} authors were deactivated.")

    deactivate_authors.short_description = "Deactivate selected authors"


@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    """Admin configuration for Node model"""

    list_display = ["name", "host", "username", "is_active", "author_count", "created_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["name", "host", "username"]
    ordering = ["-created_at"]
    actions = ["activate_nodes", "deactivate_nodes", "test_connection"]
    
    fieldsets = (
        (
            "Basic Information",
            {
                "fields": ("name", "host", "is_active")
            },
        ),
        (
            "Authentication",
            {
                "fields": ("username", "password"),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at",),
                "classes": ("collapse",),
            },
        ),
    )
    
    readonly_fields = ["created_at"]
    
    def author_count(self, obj):
        """Display count of authors from this node"""
        return obj.author_set.count()
    author_count.short_description = "Authors"
    
    def activate_nodes(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} nodes activated.")
    activate_nodes.short_description = "Activate selected nodes"
    
    def deactivate_nodes(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} nodes deactivated.")
    deactivate_nodes.short_description = "Deactivate selected nodes (stop sharing)"
    
    def test_connection(self, request, queryset):
        """Test connection to selected nodes"""
        # This could be expanded to actually test HTTP connectivity
        self.message_user(request, f"Connection test initiated for {queryset.count()} nodes.")
    test_connection.short_description = "Test connection to selected nodes"


@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    """Admin configuration for Entry model"""

    list_display = ["title", "author", "visibility", "content_type", "created_at"]
    list_filter = ["visibility", "content_type", "created_at"]
    search_fields = ["title", "content", "author__username"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "url", "created_at", "updated_at"]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """Admin configuration for Comment model"""

    list_display = ["author", "entry", "content_type", "created_at"]
    list_filter = ["content_type", "created_at"]
    search_fields = ["content", "author__username", "entry__title"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "url", "created_at", "updated_at"]


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    """Admin configuration for Like model"""

    list_display = ["author", "entry", "comment", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["author__username"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "url", "created_at"]


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    """Admin configuration for Follow model"""

    list_display = ["follower", "followed", "status", "follow_type_display", "created_at", "updated_at"]
    list_filter = ["status", "created_at", "updated_at"]
    search_fields = [
        "follower__username", 
        "followed__username",
        "follower__displayName",
        "followed__displayName",
        "follower__url",
        "followed__url"
    ]
    ordering = ["-created_at"]
    
    fieldsets = (
        (
            "Follow Relationship",
            {
                "fields": ("follower", "followed", "status")
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
    
    readonly_fields = ["created_at", "updated_at"]
    actions = ["accept_follows", "reject_follows"]
    
    def follow_type_display(self, obj):
        """Display the type of follow relationship (local-local, local-remote, etc.)"""
        follower_type = "Local" if obj.follower.is_local else "Remote"
        followed_type = "Local" if obj.followed.is_local else "Remote"
        return f"{follower_type} → {followed_type}"
    follow_type_display.short_description = "Type"
    
    def accept_follows(self, request, queryset):
        """Accept selected follow requests"""
        from app.models.follow import Follow
        updated = queryset.filter(status=Follow.REQUESTING).update(status=Follow.ACCEPTED)
        self.message_user(request, f"{updated} follow requests accepted.")
    accept_follows.short_description = "Accept selected follow requests"
    
    def reject_follows(self, request, queryset):
        """Reject selected follow requests"""
        from app.models.follow import Follow
        updated = queryset.filter(status=Follow.REQUESTING).update(status=Follow.REJECTED)
        self.message_user(request, f"{updated} follow requests rejected.")
    reject_follows.short_description = "Reject selected follow requests"


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    """Admin configuration for Friendship model"""

    list_display = ["author1", "author2", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["author1__username", "author2__username"]
    ordering = ["-created_at"]


@admin.register(Inbox)
class InboxAdmin(admin.ModelAdmin):
    """Admin configuration for Inbox model"""

    list_display = [
        "recipient",
        "activity_type",
        "object_data_display",
        "is_read",
        "delivered_at",
    ]
    list_filter = ["activity_type", "is_read", "delivered_at"]
    search_fields = ["recipient__username", "recipient__displayName"]
    ordering = ["-delivered_at"]
    readonly_fields = [
        "id",
        "delivered_at",
        "object_data_display",
        "raw_data_display",
    ]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "recipient",
                    "activity_type",
                    "is_read",
                    "delivered_at",
                )
            },
        ),
        (
            "Object Data",
            {
                "fields": ("object_data_display",),
                "classes": ("collapse",),
            },
        ),
        (
            "Raw Data",
            {
                "fields": ("raw_data_display",),
                "classes": ("collapse",),
            },
        ),
    )

    actions = ["mark_as_read", "mark_as_unread", "delete_old_items"]

    def object_data_display(self, obj):
        """Display the object data in a readable format"""
        if obj.object_data:
            data = obj.object_data
            if obj.activity_type == "entry":
                title = data.get("title", "Untitled")
                author = data.get("author", {}).get("displayName", "Unknown")
                return f"Entry: {title} by {author}"
            elif obj.activity_type == "follow":
                actor = data.get("actor", {}).get("displayName", "Unknown")
                target = data.get("object", {}).get("displayName", "Unknown")
                return f"Follow: {actor} → {target}"
            elif obj.activity_type == "like":
                author = data.get("author", {}).get("displayName", "Unknown")
                target = data.get("object", "Unknown target")
                return f"Like: {author} liked {target}"
            elif obj.activity_type == "comment":
                author = data.get("author", {}).get("displayName", "Unknown")
                content = data.get("comment", "")[:50]
                return f"Comment: {content}... by {author}"
            else:
                return str(data)
        return "No object data"

    object_data_display.short_description = "Object Data"

    def raw_data_display(self, obj):
        """Display raw JSON data in a formatted way"""
        import json
        try:
            return json.dumps(obj.raw_data, indent=2)
        except:
            return str(obj.raw_data)

    raw_data_display.short_description = "Raw Federation Data"

    def mark_as_read(self, request, queryset):
        """Mark selected inbox items as read"""
        updated = queryset.update(is_read=True)
        self.message_user(request, f"{updated} inbox items marked as read.")

    mark_as_read.short_description = "Mark selected items as read"

    def mark_as_unread(self, request, queryset):
        """Mark selected inbox items as unread"""
        updated = queryset.update(is_read=False)
        self.message_user(request, f"{updated} inbox items marked as unread.")

    mark_as_unread.short_description = "Mark selected items as unread"

    def delete_old_items(self, request, queryset):
        """Delete selected inbox items"""
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f"{count} inbox items deleted.")

    delete_old_items.short_description = "Delete selected items"

    def has_add_permission(self, request):
        """Disable adding inbox items through admin (they should come from federation)"""
        return False


