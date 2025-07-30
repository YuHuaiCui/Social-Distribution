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
        "is_approved",
        "is_active",
        "is_staff",
        "node",
        "created_at",
    ]
    list_filter = [
        "is_approved",
        "is_active",
        "is_staff",
        "is_superuser",
        "node",
        "created_at",
    ]
    search_fields = ["username", "email", "displayName", "github_username"]
    ordering = ["-created_at"]

    # Add custom fields to the fieldsets
    fieldsets = UserAdmin.fieldsets + (
        (
            "Profile Information",
            {"fields": ("displayName", "github_username", "profileImage", "bio")},
        ),
        ("Federation", {"fields": ("url", "node", "is_approved")}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    readonly_fields = ["id", "url", "created_at", "updated_at"]

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

    list_display = ["name", "host", "is_active", "created_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["name", "host"]
    ordering = ["-created_at"]
    actions = ["activate_nodes", "deactivate_nodes"]
    
    def activate_nodes(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} nodes activated.")
    activate_nodes.short_description = "Activate selected nodes"
    
    def deactivate_nodes(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} nodes deactivated.")
    deactivate_nodes.short_description = "Deactivate selected nodes (stop sharing)"


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

    list_display = ["follower", "followed", "status", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["follower__username", "followed__username"]
    ordering = ["-created_at"]


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

    list_display = ["recipient", "item_type", "is_read", "created_at"]
    list_filter = ["item_type", "is_read", "created_at"]
    search_fields = ["recipient__username"]
    ordering = ["-created_at"]
