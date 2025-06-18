from rest_framework import serializers
from app.models.image import UploadedImage

class UploadedImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    content_type = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source='uploaded_at', read_only=True)
    owner = serializers.SerializerMethodField()
    
    class Meta:
        model = UploadedImage
        fields = ['id', 'url', 'content_type', 'created_at', 'owner', 'image']
        
    def get_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
        
    def get_content_type(self, obj):
        if obj.image:
            # Try to determine content type from file extension
            name = obj.image.name.lower()
            if name.endswith('.png'):
                return 'image/png'
            elif name.endswith('.jpg') or name.endswith('.jpeg'):
                return 'image/jpeg'
            elif name.endswith('.gif'):
                return 'image/gif'
            elif name.endswith('.webp'):
                return 'image/webp'
        return 'image/jpeg'  # default
        
    def get_owner(self, obj):
        if obj.owner:
            return str(obj.owner.id)
        return None