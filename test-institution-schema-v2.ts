import { z } from 'zod';

// Validation limits
const VALIDATION_LIMITS = {
  institution: { max: 100 },
} as const;

// Test the current schema
const institutionSchemaCurrent = z.string()
  .trim()
  .max(VALIDATION_LIMITS.institution.max, `Institution name must be less than ${VALIDATION_LIMITS.institution.max} characters`)
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return val;
  });

// Test with preprocess (like the original)
const institutionSchemaPreprocess = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const trimmed = String(val).trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string()
    .max(VALIDATION_LIMITS.institution.max, `Institution name must be less than ${VALIDATION_LIMITS.institution.max} characters`)
    .optional()
);

// Test with .or(z.literal('')) pattern (like asset schema)
const institutionSchemaOrLiteral = z.string()
  .max(VALIDATION_LIMITS.institution.max, `Institution name must be less than ${VALIDATION_LIMITS.institution.max} characters`)
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((val) => val === '' ? undefined : val);

// Test with refine pattern
const institutionSchemaRefine = z.string()
  .trim()
  .optional()
  .refine((val) => val === undefined || val === '' || val.length <= VALIDATION_LIMITS.institution.max, {
    message: `Institution name must be less than ${VALIDATION_LIMITS.institution.max} characters`
  })
  .transform((val) => val === '' || val === undefined ? undefined : val);

console.log('Testing different schema patterns:\n');

const testCases = [
  { name: 'Empty string', value: '' },
  { name: 'Whitespace only', value: '   ' },
  { name: 'Undefined', value: undefined },
  { name: 'Valid string', value: 'ANZ' },
  { name: 'Too long', value: 'a'.repeat(101) },
];

function testSchema(name: string, schema: z.ZodTypeAny, testCases: Array<{name: string, value: any}>) {
  console.log(`\n--- ${name} ---`);
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const result = schema.safeParse(testCase.value);
    
    if (result.success) {
      const output = result.data;
      const shouldBeUndefined = testCase.value === '' || testCase.value === '   ' || testCase.value === undefined;
      const isValid = shouldBeUndefined ? output === undefined : (testCase.value === 'ANZ' && output === 'ANZ');
      
      if (isValid) {
        console.log(`✓ ${testCase.name}: ${JSON.stringify(testCase.value)} → ${JSON.stringify(output)}`);
        passed++;
      } else {
        console.log(`✗ ${testCase.name}: ${JSON.stringify(testCase.value)} → ${JSON.stringify(output)} (unexpected)`);
        failed++;
      }
    } else {
      if (testCase.value === 'a'.repeat(101)) {
        console.log(`✓ ${testCase.name}: FAILED (as expected)`);
        passed++;
      } else {
        console.log(`✗ ${testCase.name}: FAILED - ${result.error.errors[0]?.message}`);
        failed++;
      }
    }
  }
  
  console.log(`Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

const results1 = testSchema('Current Schema (optional + transform)', institutionSchemaCurrent, testCases);
const results2 = testSchema('Preprocess Schema', institutionSchemaPreprocess, testCases);
const results3 = testSchema('Or Literal Schema', institutionSchemaOrLiteral, testCases);
const results4 = testSchema('Refine Schema', institutionSchemaRefine, testCases);

console.log('\n=== Summary ===');
console.log(`Current: ${results1.passed}/${results1.passed + results1.failed}`);
console.log(`Preprocess: ${results2.passed}/${results2.passed + results2.failed}`);
console.log(`Or Literal: ${results3.passed}/${results3.passed + results3.failed}`);
console.log(`Refine: ${results4.passed}/${results4.passed + results4.failed}`);

// Test with form object
console.log('\n=== Testing with form object ===\n');

const accountSchema1 = z.object({
  institution: institutionSchemaCurrent,
  accountName: z.string().min(1),
});

const accountSchema2 = z.object({
  institution: institutionSchemaPreprocess,
  accountName: z.string().min(1),
});

const formData = {
  institution: '',
  accountName: 'Test Account',
};

console.log('Test: Empty string in form data');
const r1 = accountSchema1.safeParse(formData);
const r2 = accountSchema2.safeParse(formData);

console.log(`Current schema: ${r1.success ? `✓ institution = ${JSON.stringify(r1.data.institution)}` : `✗ ${r1.error.errors[0]?.message}`}`);
console.log(`Preprocess schema: ${r2.success ? `✓ institution = ${JSON.stringify(r2.data.institution)}` : `✗ ${r2.error.errors[0]?.message}`}`);

if (!r1.success || r1.data.institution !== undefined) {
  console.log('\n❌ Current schema FAILED - this is the problem!');
  process.exit(1);
}





