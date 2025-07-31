from rest_framework import serializers
from app.models import Inbox


class InboxSerializer(serializers.ModelSerializer):
    """Serializer for inbox items."""

    class Meta:
        model = Inbox
        fields = [
            "id",
            "activity_type",
            "object_data",
            "is_read",
            "delivered_at",
            "raw_data",
        ]
        read_only_fields = ["id", "delivered_at"]


class ActivitySerializer(serializers.Serializer):
    """
    Serializer for validating incoming activities to the inbox.
    Validates the structure and determines the activity type.
    """

    type = serializers.CharField()
    
    # Declare all possible fields to ensure DRF processes them
    id = serializers.CharField(required=False, allow_blank=True)
    title = serializers.CharField(required=False, allow_blank=True)
    content = serializers.CharField(required=False, allow_blank=True)
    contentType = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    visibility = serializers.CharField(required=False, allow_blank=True)
    source = serializers.CharField(required=False, allow_blank=True)
    origin = serializers.CharField(required=False, allow_blank=True)
    web = serializers.CharField(required=False, allow_blank=True)
    published = serializers.CharField(required=False, allow_blank=True)
    
    # Nested objects
    author = serializers.DictField(required=False)
    actor = serializers.DictField(required=False)
    object = serializers.JSONField(required=False)  # For likes (string) and follows (dict)
    entry = serializers.CharField(required=False, allow_blank=True)   # For comments - URL as string
    comment = serializers.CharField(required=False, allow_blank=True) # For comments - content

    def validate_type(self, value):
        """Validate that the activity type is supported."""
        valid_types = ["entry", "follow", "like", "comment"]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Unsupported activity type: {value}. "
                f"Must be one of: {', '.join(valid_types)}"
            )
        return value

    def validate(self, data):
        """Validate the entire activity object based on its type per spec."""
        activity_type = data.get("type", "")

        # Basic validation - each activity type should have required fields per spec
        if activity_type == "entry":
            required_fields = ["id", "author", "title", "content", "contentType"]
            # Validate author structure
            if "author" in data and not isinstance(data["author"], dict):
                raise serializers.ValidationError("Entry author must be an object")
            if "author" in data and "id" not in data["author"]:
                raise serializers.ValidationError("Entry author must have an id field")

        elif activity_type == "follow":
            required_fields = ["actor", "object"]
            # Validate actor and object structure
            if "actor" in data and not isinstance(data["actor"], dict):
                raise serializers.ValidationError("Follow actor must be an object")
            if "object" in data and not isinstance(data["object"], dict):
                raise serializers.ValidationError("Follow object must be an object")
            if "actor" in data and "id" not in data["actor"]:
                raise serializers.ValidationError("Follow actor must have an id field")
            if "object" in data and "id" not in data["object"]:
                raise serializers.ValidationError("Follow object must have an id field")

        elif activity_type == "like":
            required_fields = ["id", "author", "object"]
            # Validate author structure
            if "author" in data and not isinstance(data["author"], dict):
                raise serializers.ValidationError("Like author must be an object")
            if "author" in data and "id" not in data["author"]:
                raise serializers.ValidationError("Like author must have an id field")
            if "object" not in data or not data["object"]:
                raise serializers.ValidationError("Like must have an object field")

        elif activity_type == "comment":
            required_fields = ["id", "author", "comment", "entry"]
            # Validate author structure
            if "author" in data and not isinstance(data["author"], dict):
                raise serializers.ValidationError("Comment author must be an object")
            if "author" in data and "id" not in data["author"]:
                raise serializers.ValidationError(
                    "Comment author must have an id field"
                )
        else:
            raise serializers.ValidationError("Invalid activity type")

        # Check that required fields are present
        for field in required_fields:
            if field not in data:
                raise serializers.ValidationError(
                    f"Missing required field '{field}' for {activity_type} activity"
                )

        return data
