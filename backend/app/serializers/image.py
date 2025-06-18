from rest_framework import serializers
from app.models import image

class UploadedImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = image
        fields = ['id', 'image', 'uploaded_at']