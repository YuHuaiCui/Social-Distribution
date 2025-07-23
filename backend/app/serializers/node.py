from drf_spectacular.utils import OpenApiExample
from rest_framework import serializers
from ..models import Node


class NodeSerializer(serializers.ModelSerializer):
    """Serializer for Node model"""
    
    class Meta:
        model = Node
        fields = ['id', 'name', 'host', 'username', 'password', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
        # Remove write_only for password so it's included in GET requests for the frontend
        extra_kwargs = {}
        
        examples = [
            OpenApiExample(
                name="Node Example",
                value={
                    "name": "Test Node",
                    "host": "http://newnode.com",
                    "username": "newuser",
                    "password": "newpassword123",
                    "is_active": True
                }
            )
        ]


class NodeWithAuthenticationSerializer(serializers.ModelSerializer):
    """Serializer for Node model with authentication status"""
    
    is_authenticated = serializers.BooleanField(source='is_active', default=True)

    class Meta:
        model = Node
        fields = ['host', 'username', 'password', 'is_authenticated']
        extra_kwargs = {
            'password': {'write_only': True}
        }
        
        examples = [
            OpenApiExample(
                name="Node Example",
                value={
                    "host": "http://newnode.com",
                    "username": "newuser",
                    "password": "newpassword123",
                    "is_authenticated": True
                }
            )
        ]


class NodeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new Node objects"""
    
    class Meta:
        model = Node
        fields = ['name', 'host', 'username', 'password', 'is_active']
        extra_kwargs = {
            'password': {'write_only': True},
            'is_active': {'default': True}
        }
        
        examples = [
            OpenApiExample(
                name="Create Node Example",
                value={
                    "name": "New Test Node",
                    "host": "http://newnode.com",
                    "username": "newuser",
                    "password": "newpassword123",
                    "is_active": True
                }
            )
        ]

    def validate_host(self, value):
        """Validate that the host URL is unique"""
        if Node.objects.filter(host=value).exists():
            raise serializers.ValidationError("A node with this host already exists.")
        return value


class NodeUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating Node objects"""
    
    class Meta:
        model = Node
        fields = ['name', 'username', 'password', 'is_active']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'name': {'required': False},
            'username': {'required': False},
            'is_active': {'required': False}
        }
        
        examples = [
            OpenApiExample(
                name="Update Node Example",
                value={
                    "name": "Updated Node Name",
                    "username": "updateduser",
                    "password": "updatedpassword123",
                    "is_active": False
                }
            )
        ]

    def update(self, instance, validated_data):
        """Update only provided fields"""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance 