/**
 * Image Service
 * Handles image upload and management
 */

import { BaseApiService } from "../base";

export interface ImageUploadResponse {
  id: string;
  url: string;
  content_type: string;
  created_at: string;
  owner: string;
}

export class ImageService extends BaseApiService {
  /**
   * Upload an image file
   */
  async uploadImage(file: File): Promise<ImageUploadResponse> {
    const formData = new FormData();
    formData.append("image", file);

    // Use the requestFormData method which handles multipart/form-data requests
    return this.requestFormData<ImageUploadResponse>("/api/upload-image/", formData);
  }

  /**
   * Upload multiple images
   */
  async uploadImages(files: File[]): Promise<ImageUploadResponse[]> {
    // Upload images in parallel for better performance
    const uploadPromises = files.map(file => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }

  /**
   * Get image by ID
   */
  async getImage(imageId: string): Promise<ImageUploadResponse> {
    return this.request<ImageUploadResponse>(`/api/images/${imageId}/`);
  }

  /**
   * Delete an image
   */
  async deleteImage(imageId: string): Promise<void> {
    await this.request(`/api/images/${imageId}/`, {
      method: "DELETE",
    });
  }
}

// Export singleton instance
export const imageService = new ImageService();

export default ImageService;