import { UserFriendlyError } from '../types';

export class CloudinaryService {
  private static instance: CloudinaryService;
  private cloudName: string;
  private uploadPreset: string;

  private constructor() {
    this.cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || '';
    this.uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || '';

    if (!this.cloudName || !this.uploadPreset) {
      console.warn('Cloudinary credentials missing. Image uploads will fail.');
    }
  }

  public static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  /**
   * Upload an image to Cloudinary
   * @param file The file to upload
   * @returns The secure URL of the uploaded image
   */
  async uploadImage(file: File): Promise<string> {
    if (!this.cloudName || !this.uploadPreset) {
      throw new UserFriendlyError('Image upload configuration is missing. Please contact support.');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.uploadPreset);
      
      // Auto-format and auto-quality for optimization
      // Note: These are often set in the Upload Preset settings in Cloudinary dashboard,
      // but we can also request them here if the preset allows overriding.
      // For now, we rely on the preset or Cloudinary's default handling.
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cloudinary upload error:', errorData);
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new UserFriendlyError('Failed to upload image. Please try again.');
    }
  }
}

export const cloudinaryService = CloudinaryService.getInstance();
