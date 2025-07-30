from django.db import models


class Node(models.Model):
    """Represents a remote node that this node can communicate with"""

    name = models.CharField(max_length=255)
    host = models.URLField(unique=True, help_text="Base URL of the remote node")
    username = models.CharField(
        max_length=255, help_text="Username for HTTP Basic Auth"
    )
    password = models.CharField(
        max_length=255, help_text="Password for HTTP Basic Auth"
    )
    is_active = models.BooleanField(
        default=True, help_text="Whether to accept connections from this node"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["is_active"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        """
        String representation of the node.

        Returns:
            str: A human-readable string showing the node name and host URL
        """
        return f"{self.name} ({self.host})"

    def deactivate(self):
        """
        Deactivate this node to stop sharing with it.
        This is safer than deletion as it preserves history.
        """
        self.is_active = False
        self.save()
        return self
