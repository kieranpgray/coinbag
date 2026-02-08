#!/usr/bin/env tsx
/**
 * Verification script for the institution optional field fix
 * This script tests that accounts can be created with empty/null/undefined institution fields
 */

// Import the schemas to test them directly
import { accountCreateSchema } from '../src/contracts/accounts';
import { assetCreateSchema } from '../src/contracts/assets';
import { liabilityCreateSchema } from '../src/contracts/liabilities';

console.log('🔍 Verifying Institution Optional Field Fix\n');

let passed = 0;
let failed = 0;

// Test account creation with empty institution
const accountTests = [
  {
    name: 'Account with empty institution string',
    data: {
      accountName: 'Test Account',
      balance: 100,
      accountType: 'Bank Account',
      lastUpdated: new Date().toISOString(),
      hidden: false,
      institution: '' // Empty string
    }
  },
  {
    name: 'Account with whitespace institution',
    data: {
      accountName: 'Test Account 2',
      balance: 200,
      accountType: 'Bank Account',
      lastUpdated: new Date().toISOString(),
      hidden: false,
      institution: '   ' // Whitespace only
    }
  },
  {
    name: 'Account without institution field',
    data: {
      accountName: 'Test Account 3',
      balance: 300,
      accountType: 'Bank Account',
      lastUpdated: new Date().toISOString(),
      hidden: false
      // No institution field
    }
  }
];

console.log('Testing Account Creation:');
accountTests.forEach(test => {
  const result = accountCreateSchema.safeParse(test.data);
  if (result.success) {
    console.log(`✅ ${test.name}: PASSED`);
    console.log(`   Institution value: ${JSON.stringify(result.data.institution)}`);
    if (result.data.institution === undefined) {
      passed++;
    } else {
      console.log(`   ⚠️ Expected undefined, got: ${result.data.institution}`);
      failed++;
    }
  } else {
    console.log(`❌ ${test.name}: FAILED`);
    console.log(`   Error: ${result.error.errors[0]?.message}`);
    failed++;
  }
  console.log('');
});

// Test asset creation with empty institution
console.log('Testing Asset Creation:');
const assetTests = [
  {
    name: 'Asset with empty institution',
    data: {
      name: 'Test Asset',
      type: 'Real Estate',
      value: 100000,
      dateAdded: new Date().toISOString().split('T')[0],
      institution: ''
    }
  }
];

assetTests.forEach(test => {
  const result = assetCreateSchema.safeParse(test.data);
  if (result.success) {
    console.log(`✅ ${test.name}: PASSED`);
    console.log(`   Institution value: ${JSON.stringify(result.data.institution)}`);
    if (result.data.institution === undefined) {
      passed++;
    } else {
      console.log(`   ⚠️ Expected undefined, got: ${result.data.institution}`);
      failed++;
    }
  } else {
    console.log(`❌ ${test.name}: FAILED`);
    console.log(`   Error: ${result.error.errors[0]?.message}`);
    failed++;
  }
  console.log('');
});

// Test liability creation with empty institution
console.log('Testing Liability Creation:');
const liabilityTests = [
  {
    name: 'Liability with empty institution',
    data: {
      name: 'Test Loan',
      type: 'Loans',
      balance: 50000,
      institution: ''
    }
  }
];

liabilityTests.forEach(test => {
  const result = liabilityCreateSchema.safeParse(test.data);
  if (result.success) {
    console.log(`✅ ${test.name}: PASSED`);
    console.log(`   Institution value: ${JSON.stringify(result.data.institution)}`);
    if (result.data.institution === undefined) {
      passed++;
    } else {
      console.log(`   ⚠️ Expected undefined, got: ${result.data.institution}`);
      failed++;
    }
  } else {
    console.log(`❌ ${test.name}: FAILED`);
    console.log(`   Error: ${result.error.errors[0]?.message}`);
    failed++;
  }
  console.log('');
});

console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n🎉 All validation tests passed!');
  console.log('\nNext steps:');
  console.log('1. Run the database migration: ./scripts/run-institution-migration.sh');
  console.log('2. Test in the application by creating accounts without institutions');
} else {
  console.log('\n❌ Some tests failed. Please check the implementation.');
  process.exit(1);
}
