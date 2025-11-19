# Product Catalog and Browsing System

A React-based product catalog system for an online clothing store, built with Firebase backend services.

## Features

- Browse products by category and subcategory
- Filter products by multiple attributes (size, color, price, availability)
- View detailed product information
- Real-time inventory updates
- Responsive design for all devices

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Backend**: Firebase (Firestore, Storage, Authentication)
- **Routing**: React Router v6
- **Testing**: Jest + React Testing Library

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database, Storage, and Authentication
3. Copy your Firebase configuration
4. Copy `.env.example` to `.env.local`
5. Fill in your Firebase configuration values in `.env.local`

### 3. Run the Application

```bash
# Development server (production Firebase)
npm start

# Development server with Firebase emulators (recommended)
npm run start:emulator

# Start Firebase emulators (in separate terminal)
npm run firebase:emulators

# Build for production
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
```

### Firebase Emulators (Recommended for Development)

For local development, it's recommended to use Firebase emulators:

1. Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

2. Start the emulators:
```bash
npm run firebase:emulators
```

3. In another terminal, start the React app with emulator mode:
```bash
npm run start:emulator
```

The emulator UI will be available at http://localhost:4000

## Project Structure

```
src/
├── components/          # React components
│   ├── CategoryNavigation/
│   ├── ProductCard/
│   ├── ProductListing/
│   ├── FilterPanel/
│   └── ProductDetail/
├── services/           # Firebase service classes
│   ├── ProductService.ts
│   └── CategoryService.ts
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── config/             # Configuration files
│   └── firebase.ts
├── App.tsx
└── index.tsx
```

## Environment Variables

Required environment variables (see `.env.example`):

- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_USE_FIREBASE_EMULATOR` (set to 'true' for local development)

## Development

This project follows the requirements and design specified in the `.kiro/specs/product-catalog-browsing/` directory.

### Next Steps

1. Implement core data models and Firebase services (Task 2)
2. Create category navigation and product listing components (Task 3)
3. Implement filtering system (Task 4)
4. Create product detail page (Task 5)
5. Add real-time inventory and performance optimizations (Task 6)
6. Final integration and testing (Task 7)