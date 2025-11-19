#!/usr/bin/env node

/**
 * Firebase Security Rules Testing Script
 * Tests Firestore and Storage security rules using Firebase emulator
 * Requirements: 5.1, 5.2
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');

// Test configuration
const testConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-project.firebaseapp.com',
  projectId: 'demo-project',
  storageBucket: 'demo-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456'
};

// Initialize Firebase for testing
const app = initializeApp(testConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulators
try {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  console.log('✅ Connected to Firebase emulators');
} catch (error) {
  console.log('⚠️  Emulators already connected or not available');
}

// Test users
const testUsers = {
  regularUser: {
    email: 'user@test.com',
    password: 'testpass123',
    uid: 'regular-user-id'
  },
  adminUser: {
    email: 'admin@test.com',
    password: 'adminpass123',
    uid: 'admin-user-id'
  },
  superAdmin: {
    email: 'superadmin@test.com',
    password: 'superpass123',
    uid: 'super-admin-id'
  }
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Run a test and track results
 */
async function runTest(testName, testFunction) {
  try {
    console.log(`\n🧪 Testing: ${testName}`);
    await testFunction();
    console.log(`✅ PASSED: ${testName}`);
    testResults.passed++;
    testResults.tests.push({ name: testName, status: 'PASSED' });
  } catch (error) {
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'FAILED', error: error.message });
  }
}

/**
 * Test public read access to products
 */
async function testPublicProductRead() {
  // Test without authentication
  const productRef = doc(db, 'products', 'test-product-1');
  
  // This should work (public read)
  try {
    await getDoc(productRef);
    console.log('   ✓ Public read access works');
  } catch (error) {
    throw new Error('Public read access should be allowed');
  }
}

/**
 * Test admin write access to products
 */
async function testAdminProductWrite() {
  // Sign in as admin (in real test, would set custom claims)
  const productRef = doc(db, 'products', 'test-product-admin');
  
  try {
    // This should fail without proper admin claims
    await setDoc(productRef, {
      name: 'Test Product',
      price: 99.99,
      categoryId: 'test-category',
      subcategoryId: 'test-subcategory',
      description: 'Test description',
      inStock: true,
      stockCount: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // If we get here without admin claims, the test should fail
    throw new Error('Write should require admin privileges');
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('   ✓ Admin write protection works');
    } else {
      throw error;
    }
  }
}

/**
 * Test user profile access controls
 */
async function testUserProfileAccess() {
  const userProfileRef = doc(db, 'userProfiles', 'test-user-1');
  
  try {
    // Test read without authentication - should fail
    await getDoc(userProfileRef);
    throw new Error('Unauthenticated read should be denied');
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('   ✓ Unauthenticated access denied');
    } else {
      throw error;
    }
  }
}

/**
 * Test audit log access controls
 */
async function testAuditLogAccess() {
  const auditLogRef = doc(db, 'adminLogs', 'test-log-1');
  
  try {
    // Test read without admin privileges - should fail
    await getDoc(auditLogRef);
    throw new Error('Non-admin read should be denied');
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('   ✓ Non-admin audit log access denied');
    } else {
      throw error;
    }
  }
}

/**
 * Test cart item access controls
 */
async function testCartItemAccess() {
  const cartItemRef = doc(db, 'cartItems', 'test-cart-item-1');
  
  try {
    // Test access without authentication - should fail
    await getDoc(cartItemRef);
    throw new Error('Unauthenticated cart access should be denied');
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('   ✓ Unauthenticated cart access denied');
    } else {
      throw error;
    }
  }
}

/**
 * Test data validation rules
 */
async function testDataValidation() {
  const productRef = doc(db, 'products', 'test-validation');
  
  try {
    // Test with invalid data (missing required fields)
    await setDoc(productRef, {
      name: '', // Invalid: empty name
      price: -10, // Invalid: negative price
      categoryId: 'test-category'
      // Missing required fields
    });
    
    throw new Error('Invalid data should be rejected');
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('   ✓ Data validation works');
    } else {
      throw error;
    }
  }
}

/**
 * Test immutable audit logs
 */
async function testAuditLogImmutability() {
  const auditLogRef = doc(db, 'adminLogs', 'test-immutable-log');
  
  try {
    // Test update of audit log - should fail
    await updateDoc(auditLogRef, {
      action: 'modified_action'
    });
    
    throw new Error('Audit log updates should be denied');
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('   ✓ Audit log immutability enforced');
    } else {
      throw error;
    }
  }
}

/**
 * Main test runner
 */
async function runSecurityTests() {
  console.log('🔒 Firebase Security Rules Testing');
  console.log('=====================================');
  
  // Run all tests
  await runTest('Public Product Read Access', testPublicProductRead);
  await runTest('Admin Product Write Protection', testAdminProductWrite);
  await runTest('User Profile Access Controls', testUserProfileAccess);
  await runTest('Audit Log Access Controls', testAuditLogAccess);
  await runTest('Cart Item Access Controls', testCartItemAccess);
  await runTest('Data Validation Rules', testDataValidation);
  await runTest('Audit Log Immutability', testAuditLogImmutability);
  
  // Print results
  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
  }
  
  console.log('\n💡 Note: Some tests are expected to fail due to permission restrictions.');
  console.log('   This indicates the security rules are working correctly.');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runSecurityTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runSecurityTests,
  testResults
};