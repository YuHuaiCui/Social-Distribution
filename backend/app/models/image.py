from django.db import models
from django.conf import settings

class UploadedImage(models.Model):
    """
    Model for storing user-uploaded images.
    
    This model handles image uploads for the social distribution platform,
    storing images that can be embedded in posts or used as profile pictures.
    Images are stored in the 'user_images/' directory within the media root.
    
    Attributes:
        image: ImageField storing the actual image file
        uploaded_at: Timestamp of when the image was uploaded
        owner: Reference to the user who uploaded the image (optional for backwards compatibility)
    """
    image = models.ImageField(upload_to='user_images/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='uploaded_images',
        null=True,  # Allow null for backwards compatibility
        blank=True
    )

    def __str__(self):
        """
        String representation of the uploaded image.
        
        Returns the filename of the uploaded image for easy identification
        in admin interfaces and debugging.
        
        Returns:
            str: The name of the image file
        """
        return self.image.name