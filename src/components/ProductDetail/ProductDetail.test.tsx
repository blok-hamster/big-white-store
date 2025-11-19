import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ProductDetail from './ProductDetail';
import { Product } from '../../types';

// Mock the services
jest.mock('../../services/ProductService', () => ({
  productService: {
    getProductById: jest.fn(),
    subscribeToInventoryUpdates: jest.fn(() => () => {})
  }
}));

jest.mock('../../services/CartService', () => ({
  cartService: {
    addToCart: jest.fn()
  }
}));

jest.mock('../../services/WishlistService', () => ({
  wishlistService: {
    addToWishlist: jest.fn(),
    removeFromWishlist: jest.fn(),
    isInWishlist: jest.fn()
  }
}));

// Mock the hooks
jest.mock('../../hooks', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', isAnonymous: false },
    isAuthenticated: true,
    signInAsGuest: jest.fn()
  }),
  useNotification: () => ({
    notifications: [],
    removeNotification: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn()
  })
}));

const mockProduct: Product = {
  id: 'test-product-1',
  name: 'Test Product',
  categoryId: 'test-category',
  subcategoryId: 'test-subcategory',
  price: 99.99,
  description: 'A test product for unit testing',
  features: ['Feature 1', 'Feature 2'],
  imageURLs: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  availableSizes: ['S', 'M', 'L'],
  availableColors: ['Red', 'Blue', 'Green'],
  inStock: true,
  stockCount: 10,
  specifications: {
    material: 'Cotton',
    careInstructions: 'Machine wash cold'
  },
  tags: ['casual', 'comfortable'],
  createdAt: new Date(),
  updatedAt: new Date()
};

const renderProductDetail = (productId?: string) => {
  return render(
    <BrowserRouter>
      <ProductDetail productId={productId || 'test-product-1'} />
    </BrowserRouter>
  );
};

describe('ProductDetail Component - Add to Cart and Wishlist', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    const { productService } = require('../../services/ProductService');
    const { wishlistService } = require('../../services/WishlistService');
    
    productService.getProductById.mockResolvedValue(mockProduct);
    wishlistService.isInWishlist.mockResolvedValue(false);
  });

  test('renders Add to Cart and Add to Wishlist buttons', async () => {
    renderProductDetail();

    await waitFor(() => {
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    });
    
    expect(screen.getByText('♡ Add to Wishlist')).toBeInTheDocument();
  });

  test('Add to Cart button is disabled when no size or color is selected', async () => {
    const productWithoutDefaults = {
      ...mockProduct,
      availableSizes: [],
      availableColors: []
    };
    
    const { productService } = require('../../services/ProductService');
    productService.getProductById.mockResolvedValue(productWithoutDefaults);

    renderProductDetail();

    await waitFor(() => {
      const addToCartButton = screen.getByText('Add to Cart');
      expect(addToCartButton).toBeDisabled();
    });
  });

  test('Add to Cart button works when product options are selected', async () => {
    const { cartService } = require('../../services/CartService');
    cartService.addToCart.mockResolvedValue({});

    renderProductDetail();

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const addToCartButton = screen.getByText('Add to Cart');
    expect(addToCartButton).not.toBeDisabled();

    fireEvent.click(addToCartButton);

    await waitFor(() => {
      expect(cartService.addToCart).toHaveBeenCalledWith(
        mockProduct,
        {
          selectedSize: 'S', // First available size
          selectedColor: 'Red', // First available color
          quantity: 1
        },
        { uid: 'test-user', isAnonymous: false }
      );
    });
  });

  test('Add to Wishlist button works correctly', async () => {
    const { wishlistService } = require('../../services/WishlistService');
    wishlistService.addToWishlist.mockResolvedValue({});

    renderProductDetail();

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const addToWishlistButton = screen.getByText('♡ Add to Wishlist');
    fireEvent.click(addToWishlistButton);

    await waitFor(() => {
      expect(wishlistService.addToWishlist).toHaveBeenCalledWith(
        mockProduct,
        { uid: 'test-user', isAnonymous: false }
      );
    });
  });

  test('shows correct wishlist button state when item is already in wishlist', async () => {
    const { wishlistService } = require('../../services/WishlistService');
    wishlistService.isInWishlist.mockResolvedValue(true);

    renderProductDetail();

    await waitFor(() => {
      expect(screen.getByText('♥ In Wishlist')).toBeInTheDocument();
    });
  });

  test('quantity can be changed and affects cart addition', async () => {
    const { cartService } = require('../../services/CartService');
    cartService.addToCart.mockResolvedValue({});

    renderProductDetail();

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    // Increase quantity
    const increaseButton = screen.getByLabelText('Increase quantity');
    fireEvent.click(increaseButton);
    fireEvent.click(increaseButton); // Quantity should now be 3

    const addToCartButton = screen.getByText('Add to Cart');
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      expect(cartService.addToCart).toHaveBeenCalledWith(
        mockProduct,
        {
          selectedSize: 'S',
          selectedColor: 'Red',
          quantity: 3
        },
        { uid: 'test-user', isAnonymous: false }
      );
    });
  });

  test('size and color selection affects cart addition', async () => {
    const { cartService } = require('../../services/CartService');
    cartService.addToCart.mockResolvedValue({});

    renderProductDetail();

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    // Select different size and color
    const mediumSizeButton = screen.getByText('M');
    const blueColorButton = screen.getByLabelText('Select Blue color');
    
    fireEvent.click(mediumSizeButton);
    fireEvent.click(blueColorButton);

    const addToCartButton = screen.getByText('Add to Cart');
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      expect(cartService.addToCart).toHaveBeenCalledWith(
        mockProduct,
        {
          selectedSize: 'M',
          selectedColor: 'Blue',
          quantity: 1
        },
        { uid: 'test-user', isAnonymous: false }
      );
    });
  });

  test('handles out of stock products correctly', async () => {
    const outOfStockProduct = {
      ...mockProduct,
      inStock: false,
      stockCount: 0
    };
    
    const { productService } = require('../../services/ProductService');
    productService.getProductById.mockResolvedValue(outOfStockProduct);

    renderProductDetail();

    await waitFor(() => {
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
    
    const addToCartButton = screen.getByText('Add to Cart');
    expect(addToCartButton).toBeDisabled();
  });
});