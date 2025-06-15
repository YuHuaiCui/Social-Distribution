from rest_framework import serializers
from app.models import Entry

class EntrySerializer(serializers.ModelSerializer):    class Meta:
        model = Entry
        fields = [
            "id",
            "url",
            "author",
            "title",
            "content",
            "content_type",
            "visibility",
            "source",
            "origin",
            "image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "url", "author", "source", "origin", "created_at", "updated_at"]

    def create(self, validated_data):
        # Handle image upload
        image = validated_data.pop('image', None)
        entry = super().create(validated_data)
        
        if image:
            entry.image = image
            entry.save()
            
        return entry

    def to_representation(self, instance):
        """
        Customize the representation to include author details and image URL.
        """
        data = super().to_representation(instance)
        
        # Include author information
        if instance.author:
            data['author'] = {
                'id': str(instance.author.id),
                'url': instance.author.url,
                'username': instance.author.username,
                'display_name': instance.author.display_name,
            }
        
        # Include full image URL if present
        if instance.image:
            data['image'] = self.context['request'].build_absolute_uri(instance.image.url)
        
        return data