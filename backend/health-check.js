#!/usr/bin/env node

/**
 * Health check script for the Twitter Missions backend
 * Run this to verify all services are working correctly
 */

const { admin, db: firestoreDb } = require('./firebase-admin');
const jwt = require('jsonwebtoken');

async function checkFirebase() {
  try {
    console.log('🔍 Checking Firebase connection...');
    
    // Test Firestore connection
    const testDoc = await firestoreDb.collection('health_check').doc('test').get();
    console.log('✅ Firestore connection: OK');
    
    // Test Auth connection
    const auth = admin.auth();
    console.log('✅ Firebase Auth connection: OK');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase check failed:', error.message);
    return false;
  }
}

async function checkEnvironment() {
  console.log('🔍 Checking environment variables...');
  
  const required = [
    'FIREBASE_SERVICE_ACCOUNT',
    'SESSION_SECRET',
    'TWITTER_CLIENT_ID',
    'TWITTER_CLIENT_SECRET'
  ];
  
  const missing = [];
  
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    return false;
  }
  
  console.log('✅ Environment variables: OK');
  return true;
}

async function checkJWT() {
  try {
    console.log('🔍 Checking JWT functionality...');
    
    const testUser = { id: 'test', username: 'testuser' };
    const secret = process.env.SESSION_SECRET || 'test-secret';
    
    const token = jwt.sign(testUser, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);
    
    if (decoded.username === testUser.username) {
      console.log('✅ JWT functionality: OK');
      return true;
    } else {
      console.error('❌ JWT verification failed');
      return false;
    }
  } catch (error) {
    console.error('❌ JWT check failed:', error.message);
    return false;
  }
}

async function runHealthCheck() {
  console.log('🏥 Starting health check...\n');
  
  const checks = [
    { name: 'Environment Variables', fn: checkEnvironment },
    { name: 'Firebase Services', fn: checkFirebase },
    { name: 'JWT Functionality', fn: checkJWT }
  ];
  
  const results = [];
  
  for (const check of checks) {
    const result = await check.fn();
    results.push({ name: check.name, passed: result });
  }
  
  console.log('\n📊 Health Check Results:');
  console.log('========================');
  
  let allPassed = true;
  
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
    if (!result.passed) allPassed = false;
  }
  
  console.log('\n========================');
  
  if (allPassed) {
    console.log('🎉 All health checks passed! The server should work correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some health checks failed. Please fix the issues above.');
    process.exit(1);
  }
}

// Run health check if this file is executed directly
if (require.main === module) {
  runHealthCheck().catch(error => {
    console.error('💥 Health check crashed:', error);
    process.exit(1);
  });
}

module.exports = { runHealthCheck };
