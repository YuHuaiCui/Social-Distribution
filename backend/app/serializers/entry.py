from rest_framework import serializers
from app.models import Entry

class EntrySerializer(serializers.ModelSerializer):
    class Meta:
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
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields  # optional: all fields are read-only for GET-only API
