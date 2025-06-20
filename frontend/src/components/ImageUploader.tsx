import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, X, Image as ImageIcon, AlertCircle, 
  Check, Loader2, Plus 
} from 'lucide-react';
import LoadingImage from './ui/LoadingImage';
import { imageService, type ImageUploadResponse } from '../services/image';
import { useToast } from './context/ToastContext';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  progress: number;
  error?: string;
  uploaded?: boolean;
  uploadedData?: ImageUploadResponse;
}

interface ImageUploaderProps {
  onImagesChange: (images: File[]) => void;
  onImagesUploaded?: (images: ImageUploadResponse[]) => void;
  maxImages?: number;
  maxSizeInMB?: number;
  acceptedFormats?: string[];
  className?: string;
  disabled?: boolean;
  uploadToServer?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesChange,
  onImagesUploaded,
  maxImages = 4,
  maxSizeInMB = 5,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  className = '',
  disabled = false,
  uploadToServer = false,
}) => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showError } = useToast();

  const handleFiles = useCallback((files: FileList) => {
    const newImages: UploadedImage[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      // Check if we've reached max images
      if (images.length + newImages.length >= maxImages) {
        errors.push(`Maximum ${maxImages} images allowed`);
        return;
      }

      // Check file type
      if (!acceptedFormats.includes(file.type)) {
        errors.push(`${file.name} is not a supported format`);
        return;
      }

      // Check file size
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > maxSizeInMB) {
        errors.push(`${file.name} exceeds ${maxSizeInMB}MB limit`);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const uploadedImage: UploadedImage = {
          id: `${Date.now()}-${file.name}`,
          file,
          preview: reader.result as string,
          progress: 0,
          uploaded: false,
        };
        
        setImages(prev => [...prev, uploadedImage]);
        
        // Upload to server or simulate
        if (uploadToServer) {
          uploadImageToServer(uploadedImage.id, file);
        } else {
          simulateUpload(uploadedImage.id);
        }
      };
      reader.readAsDataURL(file);
    });

    if (errors.length > 0) {
      // In a real app, show these errors in a toast
      errors.forEach(error => showError(error));
    }
  }, [images.length, maxImages, acceptedFormats, maxSizeInMB, uploadToServer, showError]);

  const simulateUpload = (imageId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setImages(prev => prev.map(img => 
          img.id === imageId 
            ? { ...img, progress: 100, uploaded: true }
            : img
        ));
      } else {
        setImages(prev => prev.map(img => 
          img.id === imageId 
            ? { ...img, progress }
            : img
        ));
      }
    }, 500);
  };

  const uploadImageToServer = async (imageId: string, file: File) => {
    try {
      // Show initial progress
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, progress: 10 }
          : img
      ));

      // Upload to server
      const response = await imageService.uploadImage(file);

      // Update with success
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, progress: 100, uploaded: true, uploadedData: response }
          : img
      ));
    } catch (error) {
      console.error('Upload error:', error);
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, error: 'Upload failed', progress: 0 }
          : img
      ));
      showError(`Failed to upload ${file.name}`);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const removeImage = (imageId: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      onImagesChange(updated.map(img => img.file));
      return updated;
    });
  };

  // Update parent when images change
  React.useEffect(() => {
    // If not uploading to server, all images are considered ready
    const readyImages = uploadToServer 
      ? images.filter(img => img.uploaded)
      : images.filter(img => !img.error);
    const readyFiles = readyImages.map(img => img.file);
    
    // Only call onImagesChange if the files have actually changed
    onImagesChange(readyFiles);
    
    // Also notify about uploaded image data if callback provided
    if (onImagesUploaded && uploadToServer) {
      const uploadedData = readyImages
        .filter(img => img.uploadedData)
        .map(img => img.uploadedData!);
      if (uploadedData.length > 0) {
        onImagesUploaded(uploadedData);
      }
    }
  }, [images, onImagesChange, onImagesUploaded, uploadToServer]); // Depend on images to catch uploadedData changes

  return (
    <div className={className}>
      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <AnimatePresence>
          {images.map((image) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative aspect-square group"
            >
              <div className="w-full h-full rounded-lg overflow-hidden glass-card-subtle">
                <LoadingImage
                  src={image.preview}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                  aspectRatio="1/1"
                />
                
                {/* Upload Progress Overlay */}
                {!image.uploaded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center"
                  >
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 size={24} className="text-white mb-2" />
                      </motion.div>
                      <p className="text-xs text-white">{Math.round(image.progress)}%</p>
                    </div>
                  </motion.div>
                )}
                
                {/* Success Overlay */}
                {image.uploaded && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                  >
                    <Check size={14} className="text-white" />
                  </motion.div>
                )}
                
                {/* Error Overlay */}
                {image.error && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center p-2">
                    <div className="text-center">
                      <AlertCircle size={20} className="text-red-500 mb-1" />
                      <p className="text-xs text-red-500">{image.error}</p>
                    </div>
                  </div>
                )}
                
                {/* Remove Button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  onClick={() => removeImage(image.id)}
                  className="absolute top-2 left-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Add More Button */}
        {images.length < maxImages && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="aspect-square rounded-lg glass-card-subtle border-2 border-dashed border-border-1 flex flex-col items-center justify-center hover:border-[var(--primary-violet)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={24} className="text-text-2 mb-1" />
            <span className="text-xs text-text-2">Add Image</span>
          </motion.button>
        )}
      </div>

      {/* Drop Zone */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        animate={{
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? 'var(--primary-violet)' : 'var(--border-1)',
        }}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isDragging ? 'bg-[var(--primary-violet)]/5' : ''}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />
        
        <motion.div
          animate={{
            y: isDragging ? -5 : 0,
          }}
          className="flex flex-col items-center"
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isDragging 
              ? 'bg-[var(--primary-violet)]/20' 
              : 'bg-glass-low'
          }`}>
            {isDragging ? (
              <ImageIcon size={32} className="text-[var(--primary-violet)]" />
            ) : (
              <Upload size={32} className="text-text-2" />
            )}
          </div>
          
          <p className="text-text-1 font-medium mb-1">
            {isDragging ? 'Drop images here' : 'Drag & drop images here'}
          </p>
          <p className="text-sm text-text-2 mb-4">
            or <span className="text-[var(--primary-violet)] hover:underline">browse</span> to upload
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 text-xs text-text-2">
            <span className="px-2 py-1 rounded-full bg-glass-low">
              Max {maxImages} images
            </span>
            <span className="px-2 py-1 rounded-full bg-glass-low">
              Up to {maxSizeInMB}MB each
            </span>
            <span className="px-2 py-1 rounded-full bg-glass-low">
              JPG, PNG, GIF, WebP
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ImageUploader;