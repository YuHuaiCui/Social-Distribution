from django.db import models
from django.conf import settings

class UploadedImage(models.Model):
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
        return self.image.name