import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, Category, Product } from '../types';

// Super Admin Configuration
const SUPER_ADMIN_CONFIG = {
  email: 'superadmin@admin.com',
  password: 'SuperAdmin123!',
  displayName: 'Super Administrator'
};

// Default Categories Data
const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  {
    name: "Men's",
    displayOrder: 1,
    subcategories: [
      { id: 'mens-clothing', name: 'Clothing', displayOrder: 1 },
      { id: 'mens-jersey', name: 'Jersey', displayOrder: 2 },
      { id: 'mens-accessories', name: 'Accessories', displayOrder: 3 }
    ]
  },
  {
    name: "Women's",
    displayOrder: 2,
    subcategories: [
      { id: 'womens-top', name: 'Top', displayOrder: 1 },
      { id: 'womens-bottom', name: 'Bottom', displayOrder: 2 },
      { id: 'womens-swimwear', name: 'Swimwear', displayOrder: 3 },
      { id: 'womens-accessories', name: 'Accessories', displayOrder: 4 },
      { id: 'womens-jersey', name: 'Jersey', displayOrder: 5 }
    ]
  },
  {
    name: 'Sale',
    displayOrder: 3,
    subcategories: [
      { id: 'sale-mens', name: "Men's Sale", displayOrder: 1 },
      { id: 'sale-womens', name: "Women's Sale", displayOrder: 2 }
    ]
  },
  {
    name: 'New Arrivals',
    displayOrder: 4,
    subcategories: [
      { id: 'new-mens', name: "Men's New", displayOrder: 1 },
      { id: 'new-womens', name: "Women's New", displayOrder: 2 }
    ]
  },
  {
    name: 'Collections',
    displayOrder: 5,
    subcategories: [
      { id: 'collection-summer', name: 'Summer Collection', displayOrder: 1 },
      { id: 'collection-winter', name: 'Winter Collection', displayOrder: 2 }
    ]
  }
];

// Sample Products Data
const SAMPLE_PRODUCTS: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Classic Cotton T-Shirt',
    categoryId: 'mens',
    subcategoryId: 'mens-clothing',
    price: 29.99,
    description: 'A comfortable and versatile cotton t-shirt perfect for everyday wear.',
    features: ['100% Cotton', 'Machine Washable', 'Comfortable Fit', 'Breathable Fabric'],
    imageURLs: ['https://via.placeholder.com/400x400?text=Cotton+T-Shirt'],
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    availableColors: ['White', 'Black', 'Navy', 'Gray'],
    inStock: true,
    stockCount: 50,
    specifications: {
      material: '100% Cotton',
      careInstructions: 'Machine wash cold, tumble dry low'
    },
    tags: ['casual', 'cotton', 'basic', 'mens']
  },
  {
    name: 'Elegant Summer Dress',
    categoryId: 'womens',
    subcategoryId: 'womens-top',
    price: 79.99,
    description: 'A beautiful summer dress perfect for any occasion.',
    features: ['Lightweight Fabric', 'Elegant Design', 'Comfortable Fit', 'Easy Care'],
    imageURLs: ['https://via.placeholder.com/400x400?text=Summer+Dress'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
    availableColors: ['Blue', 'Pink', 'White', 'Yellow'],
    inStock: true,
    stockCount: 30,
    specifications: {
      material: 'Polyester Blend',
      careInstructions: 'Hand wash or gentle machine wash'
    },
    tags: ['dress', 'summer', 'elegant', 'womens']
  },
  {
    name: 'Premium Denim Jeans',
    categoryId: 'mens',
    subcategoryId: 'mens-clothing',
    price: 89.99,
    description: 'High-quality denim jeans with a modern fit and classic style.',
    features: ['Premium Denim', 'Modern Fit', 'Durable Construction', 'Classic Style'],
    imageURLs: ['https://via.placeholder.com/400x400?text=Denim+Jeans'],
    availableSizes: ['28', '30', '32', '34', '36', '38'],
    availableColors: ['Dark Blue', 'Light Blue', 'Black'],
    inStock: true,
    stockCount: 25,
    specifications: {
      material: '98% Cotton, 2% Elastane',
      careInstructions: 'Machine wash cold, hang dry'
    },
    tags: ['jeans', 'denim', 'mens', 'casual']
  },
  {
    name: 'Sports Performance Jersey',
    categoryId: 'mens',
    subcategoryId: 'mens-jersey',
    price: 49.99,
    description: 'High-performance sports jersey with moisture-wicking technology.',
    features: ['Moisture-Wicking', 'Lightweight', 'Breathable', 'Athletic Fit'],
    imageURLs: ['https://via.placeholder.com/400x400?text=Sports+Jersey'],
    availableSizes: ['S', 'M', 'L', 'XL'],
    availableColors: ['Red', 'Blue', 'Green', 'Black'],
    inStock: true,
    stockCount: 40,
    specifications: {
      material: 'Polyester Performance Fabric',
      careInstructions: 'Machine wash cold, do not bleach'
    },
    tags: ['sports', 'jersey', 'performance', 'mens']
  },
  {
    name: 'Stylish Handbag',
    categoryId: 'womens',
    subcategoryId: 'womens-accessories',
    price: 129.99,
    description: 'A stylish and practical handbag perfect for everyday use.',
    features: ['Genuine Leather', 'Multiple Compartments', 'Adjustable Strap', 'Elegant Design'],
    imageURLs: ['https://via.placeholder.com/400x400?text=Handbag'],
    availableSizes: ['One Size'],
    availableColors: ['Black', 'Brown', 'Tan', 'Red'],
    inStock: true,
    stockCount: 15,
    specifications: {
      material: 'Genuine Leather',
      careInstructions: 'Clean with leather conditioner'
    },
    tags: ['handbag', 'accessories', 'leather', 'womens']
  }
];

export class DataSeeder {
  private static instance: DataSeeder;

  private constructor() {}

  public static getInstance(): DataSeeder {
    if (!DataSeeder.instance) {
      DataSeeder.instance = new DataSeeder();
    }
    return DataSeeder.instance;
  }

  /**
   * Check if super admin already exists
   */
  async checkSuperAdminExists(): Promise<boolean> {
    try {
      const usersRef = collection(db, 'userProfiles');
      const q = query(
        usersRef, 
        where('email', '==', SUPER_ADMIN_CONFIG.email),
        where('role', '==', 'super_admin')
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking super admin existence:', error);
      return false;
    }
  }

  /**
   * Create super admin account
   */
  async createSuperAdmin(): Promise<void> {
    try {
      console.log('Creating super admin account...');
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        SUPER_ADMIN_CONFIG.email,
        SUPER_ADMIN_CONFIG.password
      );
      
      const user = userCredential.user;
      
      // Create user profile in Firestore
      const userProfile: Omit<UserProfile, 'id'> = {
        email: SUPER_ADMIN_CONFIG.email,
        displayName: SUPER_ADMIN_CONFIG.displayName,
        role: 'super_admin',
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        metadata: {
          signUpMethod: 'seeded',
          emailVerified: true,
          loginCount: 0
        }
      };

      await setDoc(doc(db, 'userProfiles', user.uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });

      // Sign out after creation
      await signOut(auth);
      
      console.log('✅ Super admin account created successfully');
      console.log(`Email: ${SUPER_ADMIN_CONFIG.email}`);
      console.log(`Password: ${SUPER_ADMIN_CONFIG.password}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('Super admin email already exists, checking profile...');
        
        // Try to sign in and update profile if needed
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            SUPER_ADMIN_CONFIG.email,
            SUPER_ADMIN_CONFIG.password
          );
          
          const user = userCredential.user;
          
          // Update user profile to ensure super_admin role
          await setDoc(doc(db, 'userProfiles', user.uid), {
            email: SUPER_ADMIN_CONFIG.email,
            displayName: SUPER_ADMIN_CONFIG.displayName,
            role: 'super_admin',
            isActive: true,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            metadata: {
              signUpMethod: 'seeded',
              emailVerified: true,
              loginCount: 0
            }
          }, { merge: true });
          
          await signOut(auth);
          console.log('✅ Super admin profile updated');
        } catch (signInError) {
          console.error('❌ Failed to update existing super admin:', signInError);
          throw signInError;
        }
      } else {
        console.error('❌ Failed to create super admin:', error);
        throw error;
      }
    }
  }

  /**
   * Check if categories already exist
   */
  async checkCategoriesExist(): Promise<boolean> {
    try {
      const categoriesRef = collection(db, 'categories');
      const querySnapshot = await getDocs(categoriesRef);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking categories existence:', error);
      return false;
    }
  }

  /**
   * Seed default categories
   */
  async seedCategories(): Promise<void> {
    try {
      console.log('Seeding default categories...');
      
      const batch = writeBatch(db);
      
      DEFAULT_CATEGORIES.forEach((category, index) => {
        const categoryId = category.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const categoryRef = doc(db, 'categories', categoryId);
        
        batch.set(categoryRef, {
          ...category,
          id: categoryId
        });
      });
      
      await batch.commit();
      console.log('✅ Default categories seeded successfully');
    } catch (error) {
      console.error('❌ Failed to seed categories:', error);
      throw error;
    }
  }

  /**
   * Check if products already exist
   */
  async checkProductsExist(): Promise<boolean> {
    try {
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking products existence:', error);
      return false;
    }
  }

  /**
   * Seed sample products
   */
  async seedProducts(): Promise<void> {
    try {
      console.log('Seeding sample products...');
      
      const batch = writeBatch(db);
      
      SAMPLE_PRODUCTS.forEach((product, index) => {
        const productRef = doc(collection(db, 'products'));
        
        batch.set(productRef, {
          ...product,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log('✅ Sample products seeded successfully');
    } catch (error) {
      console.error('❌ Failed to seed products:', error);
      throw error;
    }
  }

  /**
   * Run complete seeding process
   */
  async seedAll(): Promise<void> {
    try {
      console.log('🌱 Starting database seeding process...');
      
      // Check and create super admin
      const superAdminExists = await this.checkSuperAdminExists();
      if (!superAdminExists) {
        await this.createSuperAdmin();
      } else {
        console.log('✅ Super admin already exists');
      }
      
      // Check and seed categories
      const categoriesExist = await this.checkCategoriesExist();
      if (!categoriesExist) {
        await this.seedCategories();
      } else {
        console.log('✅ Categories already exist');
      }
      
      // Check and seed products
      const productsExist = await this.checkProductsExist();
      if (!productsExist) {
        await this.seedProducts();
      } else {
        console.log('✅ Products already exist');
      }
      
      console.log('🎉 Database seeding completed successfully!');
      console.log('');
      console.log('Super Admin Credentials:');
      console.log(`Email: ${SUPER_ADMIN_CONFIG.email}`);
      console.log(`Password: ${SUPER_ADMIN_CONFIG.password}`);
      console.log('');
      console.log('You can now sign in to the admin dashboard at /admin/signin');
      
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Force reseed (clears existing data and reseeds)
   */
  async forceSeed(): Promise<void> {
    try {
      console.log('🔄 Force reseeding database...');
      
      // Always create/update super admin
      await this.createSuperAdmin();
      
      // Always seed categories
      await this.seedCategories();
      
      // Always seed products
      await this.seedProducts();
      
      console.log('🎉 Force reseeding completed successfully!');
      
    } catch (error) {
      console.error('❌ Force reseeding failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dataSeeder = DataSeeder.getInstance();

// Export super admin config for reference
export { SUPER_ADMIN_CONFIG };