import { z } from 'zod';

// Validation limits
const VALIDATION_LIMITS = {
  institution: { min: 1, max: 100 },
} as const;

// Test the new schema
const institutionSchema = z.string()
  .trim()
  .max(VALIDATION_LIMITS.institution.max, `Institution name must be less than ${VALIDATION_LIMITS.institution.max} characters`)
  .optional()
  .transform((val) => {
    // Convert empty/null/undefined to undefined
    // Value is already trimmed by the chain above, so just check for empty string
    if (val === undefined || val === null || val === '') return undefined;
    return val;
  });

// Test cases
const testCases = [
  { name: 'Empty string', value: '', expected: 'should pass (undefined)' },
  { name: 'Whitespace only', value: '   ', expected: 'should pass (undefined)' },
  { name: 'Undefined', value: undefined, expected: 'should pass (undefined)' },
  { name: 'Null', value: null, expected: 'should pass (undefined)' },
  { name: 'Valid string', value: 'ANZ', expected: 'should pass ("ANZ")' },
  { name: 'String with whitespace', value: '  ANZ  ', expected: 'should pass ("ANZ")' },
  { name: 'Too long', value: 'a'.repeat(101), expected: 'should fail' },
];

console.log('Testing institutionSchema:\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = institutionSchema.safeParse(testCase.value);
  
  if (result.success) {
    const output = result.data;
    console.log(`✓ ${testCase.name}: "${testCase.value}" → ${JSON.stringify(output)}`);
    
    // Check if empty strings/whitespace convert to undefined
    if ((testCase.value === '' || testCase.value === '   ') && output === undefined) {
      passed++;
    } else if (testCase.value === 'ANZ' && output === 'ANZ') {
      passed++;
    } else if (testCase.value === '  ANZ  ' && output === 'ANZ') {
      passed++;
    } else if (testCase.value === undefined && output === undefined) {
      passed++;
    } else {
      console.log(`  ⚠ Unexpected output: ${JSON.stringify(output)}`);
      failed++;
    }
  } else {
    if (testCase.expected === 'should fail') {
      console.log(`✓ ${testCase.name}: "${testCase.value}" → FAILED (as expected)`);
      passed++;
    } else {
      console.log(`✗ ${testCase.name}: "${testCase.value}" → FAILED unexpectedly`);
      console.log(`  Error: ${result.error.errors[0]?.message}`);
      failed++;
    }
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);

// Test with React Hook Form-like scenario
console.log('\n--- Testing with form-like object ---\n');

const accountCreateSchema = z.object({
  institution: institutionSchema,
  accountName: z.string().min(1),
});

const formData1 = {
  institution: '',
  accountName: 'Test Account',
};

const formData2 = {
  institution: '   ',
  accountName: 'Test Account',
};

const formData3 = {
  accountName: 'Test Account',
  // institution not provided
};

console.log('Test 1: Empty string institution');
const result1 = accountCreateSchema.safeParse(formData1);
if (result1.success) {
  console.log(`✓ Passed: institution = ${JSON.stringify(result1.data.institution)}`);
  if (result1.data.institution === undefined) {
    passed++;
  } else {
    console.log(`  ✗ Expected undefined, got ${JSON.stringify(result1.data.institution)}`);
    failed++;
  }
} else {
  console.log(`✗ Failed: ${result1.error.errors[0]?.message}`);
  failed++;
}

console.log('\nTest 2: Whitespace-only institution');
const result2 = accountCreateSchema.safeParse(formData2);
if (result2.success) {
  console.log(`✓ Passed: institution = ${JSON.stringify(result2.data.institution)}`);
  if (result2.data.institution === undefined) {
    passed++;
  } else {
    console.log(`  ✗ Expected undefined, got ${JSON.stringify(result2.data.institution)}`);
    failed++;
  }
} else {
  console.log(`✗ Failed: ${result2.error.errors[0]?.message}`);
  failed++;
}

console.log('\nTest 3: Institution not provided');
const result3 = accountCreateSchema.safeParse(formData3);
if (result3.success) {
  console.log(`✓ Passed: institution = ${JSON.stringify(result3.data.institution)}`);
  if (result3.data.institution === undefined) {
    passed++;
  } else {
    console.log(`  ✗ Expected undefined, got ${JSON.stringify(result3.data.institution)}`);
    failed++;
  }
} else {
  console.log(`✗ Failed: ${result3.error.errors[0]?.message}`);
  failed++;
}

console.log(`\nFinal Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}


