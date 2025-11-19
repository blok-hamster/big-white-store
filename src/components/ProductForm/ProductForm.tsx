import React, { useState, useEffect } from 'react';
import { Product, Category, CreateProductRequest, ProductUpdate } from '../../types';
import { categoryService } from '../../services/CategoryService';
import './ProductForm.css';

interface ProductFormProps {
  product?: Product; // For editing existing product
  onSubmit: (data: CreateProductRequest | ProductUpdate, imageFiles: File[]) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface FormData extends CreateProductRequest {
  // Additional form-specific fields can be added here
}

interface ValidationErrors {
  [key: string]: string;
}

/**
 * ProductForm component for creating and editing products
 * Requirements: 3.4
 */
const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    categoryId: '',
    subcategoryId: '',
    price: 0,
    description: '',
    features: [],
    availableSizes: [],
    availableColors: [],
    stockCount: 0,
    specifications: {
      material: '',
      careInstructions: ''
    },
    tags: []
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Load categories and initialize form data
  useEffect(() => {
    loadCategories();
    if (product) {
      initializeFormWithProduct(product);
    }
  }, [product]);

  // Generate image previews when files change
  useEffect(() => {
    generateImagePreviews();
    return () => {
      // Cleanup object URLs to prevent memory leaks
      imagePreviews.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imageFiles]);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const categoriesData = await categoryService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const initializeFormWithProduct = (product: Product) => {
    setFormData({
      name: product.name,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      price: product.price,
      description: product.description,
      features: [...product.features],
      availableSizes: [...product.availableSizes],
      availableColors: [...product.availableColors],
      stockCount: product.stockCount,
      specifications: { ...product.specifications },
      tags: [...product.tags]
    });

    // Set existing images as previews
    setImagePreviews(product.imageURLs || []);
  };

  const generateImagePreviews = () => {
    const previews: string[] = [];
    
    imageFiles.forEach(file => {
      const objectUrl = URL.createObjectURL(file);
      previews.push(objectUrl);
    });

    // If editing, include existing images
    if (product && product.imageURLs) {
      previews.unshift(...product.imageURLs);
    }

    setImagePreviews(previews);
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Required field validations
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Product name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Product name must be less than 100 characters';
    }

    if (!formData.categoryId) {
      errors.categoryId = 'Category is required';
    }

    if (!formData.subcategoryId) {
      errors.subcategoryId = 'Subcategory is required';
    }

    if (formData.price <= 0) {
      errors.price = 'Price must be greater than 0';
    } else if (formData.price > 999999) {
      errors.price = 'Price must be less than $999,999';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 2000) {
      errors.description = 'Description must be less than 2000 characters';
    }

    if (formData.stockCount < 0) {
      errors.stockCount = 'Stock count cannot be negative';
    } else if (formData.stockCount > 999999) {
      errors.stockCount = 'Stock count must be less than 999,999';
    }

    if (!formData.specifications.material.trim()) {
      errors.material = 'Material is required';
    } else if (formData.specifications.material.trim().length > 100) {
      errors.material = 'Material must be less than 100 characters';
    }

    if (!formData.specifications.careInstructions.trim()) {
      errors.careInstructions = 'Care instructions are required';
    } else if (formData.specifications.careInstructions.trim().length > 500) {
      errors.careInstructions = 'Care instructions must be less than 500 characters';
    }

    // Array field validations
    if (formData.features.length > 20) {
      errors.features = 'Maximum 20 features allowed';
    }

    if (formData.availableSizes.length > 20) {
      errors.availableSizes = 'Maximum 20 sizes allowed';
    }

    if (formData.availableColors.length > 20) {
      errors.availableColors = 'Maximum 20 colors allowed';
    }

    if (formData.tags.length > 10) {
      errors.tags = 'Maximum 10 tags allowed';
    }

    // Image validation
    if (imageFiles.length > 10) {
      errors.images = 'Maximum 10 images allowed';
    }

    // Check file sizes
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = imageFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      errors.images = 'Each image must be less than 5MB';
    }

    // Check file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = imageFiles.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      errors.images = 'Only JPEG, PNG, and WebP images are allowed';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData, imageFiles);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleArrayFieldChange = (field: keyof FormData, value: string) => {
    const items = value.split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    setFormData(prev => ({ ...prev, [field]: items }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSpecificationChange = (field: keyof FormData['specifications'], value: string) => {
    setFormData(prev => ({
      ...prev,
      specifications: { ...prev.specifications, [field]: value }
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles(files);
      
      // Clear image validation errors
      if (validationErrors.images) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.images;
          return newErrors;
        });
      }
    }
  };

  const removeImagePreview = (index: number) => {
    const newPreviews = [...imagePreviews];
    const removedUrl = newPreviews.splice(index, 1)[0];
    
    // If it's a blob URL, revoke it
    if (removedUrl && removedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(removedUrl);
    }
    
    setImagePreviews(newPreviews);
    
    // Also remove from imageFiles if it's a new file
    if (index >= (product?.imageURLs?.length || 0)) {
      const fileIndex = index - (product?.imageURLs?.length || 0);
      const newFiles = [...imageFiles];
      newFiles.splice(fileIndex, 1);
      setImageFiles(newFiles);
    }
  };

  const getSelectedSubcategories = () => {
    const category = categories.find(cat => cat.id === formData.categoryId);
    return category?.subcategories || [];
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors[field];
  };

  const isFieldInvalid = (field: string): boolean => {
    return !!validationErrors[field];
  };

  if (categoriesLoading) {
    return (
      <div className="product-form loading">
        <div className="loading-spinner">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="product-form">
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label htmlFor="name">Product Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={isFieldInvalid('name') ? 'invalid' : ''}
                placeholder="Enter product name"
                maxLength={100}
                required
              />
              {getFieldError('name') && (
                <span className="error-message">{getFieldError('name')}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="categoryId">Category *</label>
                <select
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={(e) => {
                    handleInputChange('categoryId', e.target.value);
                    handleInputChange('subcategoryId', ''); // Reset subcategory
                  }}
                  className={isFieldInvalid('categoryId') ? 'invalid' : ''}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {getFieldError('categoryId') && (
                  <span className="error-message">{getFieldError('categoryId')}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="subcategoryId">Subcategory *</label>
                <select
                  id="subcategoryId"
                  value={formData.subcategoryId}
                  onChange={(e) => handleInputChange('subcategoryId', e.target.value)}
                  className={isFieldInvalid('subcategoryId') ? 'invalid' : ''}
                  disabled={!formData.categoryId}
                  required
                >
                  <option value="">Select Subcategory</option>
                  {getSelectedSubcategories().map(subcategory => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
                {getFieldError('subcategoryId') && (
                  <span className="error-message">{getFieldError('subcategoryId')}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">Price ($) *</label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  className={isFieldInvalid('price') ? 'invalid' : ''}
                  placeholder="0.00"
                  required
                />
                {getFieldError('price') && (
                  <span className="error-message">{getFieldError('price')}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="stockCount">Stock Count *</label>
                <input
                  id="stockCount"
                  type="number"
                  min="0"
                  max="999999"
                  value={formData.stockCount}
                  onChange={(e) => handleInputChange('stockCount', parseInt(e.target.value) || 0)}
                  className={isFieldInvalid('stockCount') ? 'invalid' : ''}
                  placeholder="0"
                  required
                />
                {getFieldError('stockCount') && (
                  <span className="error-message">{getFieldError('stockCount')}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={isFieldInvalid('description') ? 'invalid' : ''}
                placeholder="Enter detailed product description"
                rows={4}
                maxLength={2000}
                required
              />
              <div className="character-count">
                {formData.description.length}/2000 characters
              </div>
              {getFieldError('description') && (
                <span className="error-message">{getFieldError('description')}</span>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="form-section">
            <h3>Product Details</h3>
            
            <div className="form-group">
              <label htmlFor="features">Features (comma-separated)</label>
              <input
                id="features"
                type="text"
                value={formData.features.join(', ')}
                onChange={(e) => handleArrayFieldChange('features', e.target.value)}
                className={isFieldInvalid('features') ? 'invalid' : ''}
                placeholder="Feature 1, Feature 2, Feature 3"
              />
              <div className="field-hint">
                Enter product features separated by commas (max 20)
              </div>
              {getFieldError('features') && (
                <span className="error-message">{getFieldError('features')}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="availableSizes">Available Sizes (comma-separated)</label>
                <input
                  id="availableSizes"
                  type="text"
                  value={formData.availableSizes.join(', ')}
                  onChange={(e) => handleArrayFieldChange('availableSizes', e.target.value)}
                  className={isFieldInvalid('availableSizes') ? 'invalid' : ''}
                  placeholder="XS, S, M, L, XL"
                />
                {getFieldError('availableSizes') && (
                  <span className="error-message">{getFieldError('availableSizes')}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="availableColors">Available Colors (comma-separated)</label>
                <input
                  id="availableColors"
                  type="text"
                  value={formData.availableColors.join(', ')}
                  onChange={(e) => handleArrayFieldChange('availableColors', e.target.value)}
                  className={isFieldInvalid('availableColors') ? 'invalid' : ''}
                  placeholder="Red, Blue, Green, Black"
                />
                {getFieldError('availableColors') && (
                  <span className="error-message">{getFieldError('availableColors')}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tags">Tags (comma-separated)</label>
              <input
                id="tags"
                type="text"
                value={formData.tags.join(', ')}
                onChange={(e) => handleArrayFieldChange('tags', e.target.value)}
                className={isFieldInvalid('tags') ? 'invalid' : ''}
                placeholder="casual, summer, cotton, comfortable"
              />
              <div className="field-hint">
                Enter tags for better searchability (max 10)
              </div>
              {getFieldError('tags') && (
                <span className="error-message">{getFieldError('tags')}</span>
              )}
            </div>
          </div>

          {/* Specifications */}
          <div className="form-section">
            <h3>Specifications</h3>
            
            <div className="form-group">
              <label htmlFor="material">Material *</label>
              <input
                id="material"
                type="text"
                value={formData.specifications.material}
                onChange={(e) => handleSpecificationChange('material', e.target.value)}
                className={isFieldInvalid('material') ? 'invalid' : ''}
                placeholder="e.g., 100% Cotton, Polyester Blend"
                maxLength={100}
                required
              />
              {getFieldError('material') && (
                <span className="error-message">{getFieldError('material')}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="careInstructions">Care Instructions *</label>
              <textarea
                id="careInstructions"
                value={formData.specifications.careInstructions}
                onChange={(e) => handleSpecificationChange('careInstructions', e.target.value)}
                className={isFieldInvalid('careInstructions') ? 'invalid' : ''}
                placeholder="e.g., Machine wash cold, tumble dry low, do not bleach"
                rows={3}
                maxLength={500}
                required
              />
              <div className="character-count">
                {formData.specifications.careInstructions.length}/500 characters
              </div>
              {getFieldError('careInstructions') && (
                <span className="error-message">{getFieldError('careInstructions')}</span>
              )}
            </div>
          </div>

          {/* Images */}
          <div className="form-section">
            <h3>Product Images</h3>
            
            <div className="form-group">
              <label htmlFor="images">Upload Images</label>
              <input
                id="images"
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                className={isFieldInvalid('images') ? 'invalid' : ''}
              />
              <div className="field-hint">
                Upload up to 10 images (JPEG, PNG, WebP). Max 5MB per image.
              </div>
              {getFieldError('images') && (
                <span className="error-message">{getFieldError('images')}</span>
              )}
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="image-previews">
                <h4>Image Previews</h4>
                <div className="preview-grid">
                  {imagePreviews.map((url, index) => (
                    <div key={index} className="preview-item">
                      <img src={url} alt={`Preview ${index + 1}`} />
                      <button
                        type="button"
                        className="remove-image"
                        onClick={() => removeImagePreview(index)}
                        aria-label={`Remove image ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button 
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;