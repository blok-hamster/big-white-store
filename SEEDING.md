# Database Seeding Guide

This document explains how to seed your Firebase database with initial data including a super admin account, default categories, and sample products.

## Quick Start

### Automatic Seeding (Development Mode)

When running in development mode, the application will automatically detect if the database is empty and show a seeding banner on the home page.

1. Start the application: `npm start`
2. Visit the home page
3. If the database is empty, you'll see a seeding banner
4. Click "Quick Seed" to automatically seed the database

### Manual Seeding Options

#### Option 1: Development Seeder Page
1. Navigate to `/dev/seed` in your browser (development mode only)
2. Use the Database Seeder interface to seed or check status
3. Choose between "Seed Database" (safe) or "Force Reseed" (overwrites existing data)

#### Option 2: Browser Console
```javascript
// Import the seeder
import { dataSeeder } from './src/utils/seedData';

// Seed only if data doesn't exist
await dataSeeder.seedAll();

// Force reseed (overwrites existing data)
await dataSeeder.forceSeed();

// Check individual components
await dataSeeder.checkSuperAdminExists();
await dataSeeder.checkCategoriesExist();
await dataSeeder.checkProductsExist();
```

#### Option 3: Command Line (Placeholder)
```bash
# Note: These commands are placeholders and require additional setup
npm run seed        # Seed if data doesn't exist
npm run seed:force  # Force reseed
```

## What Gets Seeded

### Super Admin Account
- **Email**: `superadmin@admin.com`
- **Password**: `SuperAdmin123!`
- **Role**: `super_admin`
- **Permissions**: Full system access

### Default Categories
1. **Men's**
   - Clothing
   - Jersey
   - Accessories

2. **Women's**
   - Top
   - Bottom
   - Swimwear
   - Accessories
   - Jersey

3. **Sale**
   - Men's Sale
   - Women's Sale

4. **New Arrivals**
   - Men's New
   - Women's New

5. **Collections**
   - Summer Collection
   - Winter Collection

### Sample Products
- Classic Cotton T-Shirt (Men's Clothing)
- Elegant Summer Dress (Women's Top)
- Premium Denim Jeans (Men's Clothing)
- Sports Performance Jersey (Men's Jersey)
- Stylish Handbag (Women's Accessories)

## Security Considerations

### Development vs Production

- **Development**: Seeding is enabled and accessible via UI
- **Production**: Seeding should be disabled or restricted

### Super Admin Security

⚠️ **Important**: Change the super admin password immediately after first login in production environments.

1. Sign in with the default credentials
2. Navigate to Profile Settings
3. Change the password to a secure one
4. Consider creating additional admin accounts
5. Optionally disable or delete the default super admin account

### Firebase Security Rules

The seeding process requires proper Firestore security rules. Ensure your `firestore.rules` includes:

```javascript
// User profiles collection - admin read/write access
match /userProfiles/{userId} {
  allow read: if request.auth != null && 
    (request.auth.uid == userId || request.auth.token.admin == true);
  allow write: if request.auth != null && request.auth.token.admin == true;
}

// Products and categories - admin write access
match /products/{productId} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.token.admin == true;
}

match /categories/{categoryId} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.token.admin == true;
}
```

## Custom Claims Setup

The super admin account requires Firebase custom claims to function properly. In a production environment, you'll need to set these claims using the Firebase Admin SDK:

```javascript
// Server-side code (Cloud Function or Admin SDK)
const admin = require('firebase-admin');

await admin.auth().setCustomUserClaims(uid, {
  admin: true,
  role: 'super_admin',
  permissions: ['*:*']
});
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check Firestore security rules
   - Ensure Firebase project is properly configured
   - Verify authentication is working

2. **Email Already in Use**
   - The seeder will attempt to update the existing user profile
   - If password is different, manual intervention may be required

3. **Network Errors**
   - Check Firebase configuration in `.env.local`
   - Ensure internet connection is stable
   - Verify Firebase project is active

### Checking Seed Status

Use the seeder interface or browser console to check what data exists:

```javascript
// Check individual components
const superAdminExists = await dataSeeder.checkSuperAdminExists();
const categoriesExist = await dataSeeder.checkCategoriesExist();
const productsExist = await dataSeeder.checkProductsExist();

console.log({
  superAdminExists,
  categoriesExist,
  productsExist
});
```

### Force Reseeding

If you need to completely reset the database:

```javascript
// This will overwrite existing data
await dataSeeder.forceSeed();
```

## Environment Configuration

### Firebase Emulators

For local development with Firebase emulators:

1. Set `REACT_APP_USE_FIREBASE_EMULATOR=true` in `.env.local`
2. Start emulators: `npm run firebase:emulators`
3. Start app: `npm run start:emulator`
4. Seed the emulator database

### Production Deployment

Before deploying to production:

1. Set `REACT_APP_USE_FIREBASE_EMULATOR=false`
2. Configure production Firebase project
3. Deploy Firestore security rules: `firebase deploy --only firestore:rules`
4. Seed production database (if needed)
5. Change super admin password

## API Reference

### DataSeeder Class

```typescript
class DataSeeder {
  // Check if data exists
  async checkSuperAdminExists(): Promise<boolean>
  async checkCategoriesExist(): Promise<boolean>
  async checkProductsExist(): Promise<boolean>

  // Seeding methods
  async createSuperAdmin(): Promise<void>
  async seedCategories(): Promise<void>
  async seedProducts(): Promise<void>

  // Main seeding methods
  async seedAll(): Promise<void>        // Safe seeding
  async forceSeed(): Promise<void>      // Force overwrite
}
```

### Configuration

```typescript
// Super admin configuration
const SUPER_ADMIN_CONFIG = {
  email: 'superadmin@admin.com',
  password: 'SuperAdmin123!',
  displayName: 'Super Administrator'
};
```

## Best Practices

1. **Always backup production data** before running force reseed
2. **Use safe seeding** (`seedAll()`) in production environments
3. **Change default passwords** immediately after seeding
4. **Test seeding process** in development/staging first
5. **Monitor seeding operations** through Firebase Console
6. **Document any custom seeding modifications** for your team

## Support

If you encounter issues with the seeding process:

1. Check the browser console for detailed error messages
2. Verify Firebase configuration and permissions
3. Test with Firebase emulators first
4. Review Firestore security rules
5. Check network connectivity and Firebase project status