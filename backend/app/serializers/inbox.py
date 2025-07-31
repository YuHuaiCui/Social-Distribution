from rest_framework import serializers
from app.models import Inbox


class InboxSerializer(serializers.ModelSerializer):
    """Serializer for inbox items."""
    
    class Meta:
        model = Inbox
        fields = [
            'id',
            'activity_type', 
            'object_data',
            'is_read',
            'delivered_at',
            'raw_data'
        ]
        read_only_fields = ['id', 'delivered_at']


class ActivitySerializer(serializers.Serializer):
    """
    Serializer for validating incoming activities to the inbox.
    Validates the structure and determines the activity type.
    """
    
    type = serializers.CharField()
    id = serializers.CharField(required=False)  # Accept URLs as ID for activities
    
    # Entry activity fields
    title = serializers.CharField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    content = serializers.CharField(required=False)
    contentType = serializers.CharField(required=False)
    visibility = serializers.CharField(required=False)
    source = serializers.CharField(required=False, allow_blank=True)
    origin = serializers.CharField(required=False, allow_blank=True)
    web = serializers.CharField(required=False, allow_blank=True)
    published = serializers.CharField(required=False)
    author = serializers.JSONField(required=False)
    
    # Follow activity fields
    actor = serializers.JSONField(required=False)
    object = serializers.JSONField(required=False)
    
    # Comment activity fields
    comment = serializers.CharField(required=False)
    entry = serializers.CharField(required=False)
    
    def validate_type(self, value):
        """Validate that the activity type is supported."""
        valid_types = ['entry', 'follow', 'like', 'comment']
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Unsupported activity type: {value}. "
                f"Must be one of: {', '.join(valid_types)}"
            )
        return value
    
    def validate(self, data):
        """Validate the entire activity object based on its type per spec."""
        activity_type = data.get('type', '')
        
        # Basic validation - each activity type should have required fields per spec
        if activity_type == 'entry':
            required_fields = ['id', 'author', 'title', 'content', 'contentType']
            # Validate author structure
            if 'author' in data and not isinstance(data['author'], dict):
                raise serializers.ValidationError("Entry author must be an object")
            if 'author' in data and 'id' not in data['author']:
                raise serializers.ValidationError("Entry author must have an id field")
                
        elif activity_type == 'follow':
            required_fields = ['actor', 'object']
            # Validate actor and object structure
            if 'actor' in data and not isinstance(data['actor'], dict):
                raise serializers.ValidationError("Follow actor must be an object")
            if 'object' in data and not isinstance(data['object'], dict):
                raise serializers.ValidationError("Follow object must be an object")
            if 'actor' in data and 'id' not in data['actor']:
                raise serializers.ValidationError("Follow actor must have an id field")
            if 'object' in data and 'id' not in data['object']:
                raise serializers.ValidationError("Follow object must have an id field")
                
        elif activity_type == 'like':
            required_fields = ['id', 'author', 'object']
            # Validate author structure
            if 'author' in data and not isinstance(data['author'], dict):
                raise serializers.ValidationError("Like author must be an object")
            if 'author' in data and 'id' not in data['author']:
                raise serializers.ValidationError("Like author must have an id field")
            if 'object' not in data or not data['object']:
                raise serializers.ValidationError("Like must have an object field")
                
        elif activity_type == 'comment':
            required_fields = ['id', 'author', 'comment', 'entry']
            # Validate author structure  
            if 'author' in data and not isinstance(data['author'], dict):
                raise serializers.ValidationError("Comment author must be an object")
            if 'author' in data and 'id' not in data['author']:
                raise serializers.ValidationError("Comment author must have an id field")
        else:
            raise serializers.ValidationError("Invalid activity type")
            
        # Check that required fields are present
        # Use self.initial_data to check for fields that might not be in validated data yet
        check_data = {**self.initial_data, **data}
        for field in required_fields:
            if field not in check_data or check_data[field] is None:
                raise serializers.ValidationError(
                    f"Missing required field '{field}' for {activity_type} activity"
                )
        
        return data