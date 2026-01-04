import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Copy the actual schema
const VALIDATION_LIMITS = {
  institution: { max: 100 },
} as const;

const institutionSchema = z.string()
  .trim()
  .max(VALIDATION_LIMITS.institution.max, `Institution name must be less than ${VALIDATION_LIMITS.institution.max} characters`)
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return val;
  });

const testSchema = z.object({
  institution: institutionSchema,
  accountName: z.string().min(1, 'Account name is required'),
});

// Simulate what React Hook Form does - it validates each field
console.log('Testing with zodResolver simulation:\n');

// Test what happens when React Hook Form validates
const resolver = zodResolver(testSchema);

// Simulate form data with empty institution
const formValues = {
  institution: '',
  accountName: 'Test Account',
};

console.log('Form values:', formValues);

// Try to validate using the resolver
// Note: zodResolver returns a function that React Hook Form calls
// We need to call it with the form values

// Actually, let's just test the schema directly but check what happens
// when we validate the whole object vs individual fields

console.log('\n1. Testing full object validation:');
const fullResult = testSchema.safeParse(formValues);
if (fullResult.success) {
  console.log(`✓ Full validation passed: institution = ${JSON.stringify(fullResult.data.institution)}`);
} else {
  console.log(`✗ Full validation failed:`);
  fullResult.error.errors.forEach(err => {
    console.log(`  - ${err.path.join('.')}: ${err.message}`);
  });
}

console.log('\n2. Testing individual field validation (like RHF might do):');
// React Hook Form might validate fields individually
const institutionFieldSchema = institutionSchema;
const institutionResult = institutionFieldSchema.safeParse('');
if (institutionResult.success) {
  console.log(`✓ Institution field validation passed: ${JSON.stringify(institutionResult.data)}`);
  if (institutionResult.data !== undefined) {
    console.log(`  ⚠ Problem: Empty string didn't convert to undefined!`);
  }
} else {
  console.log(`✗ Institution field validation failed:`);
  institutionResult.error.errors.forEach(err => {
    console.log(`  - ${err.message}`);
  });
}

// Let's also test what happens if we use the schema in a different way
console.log('\n3. Testing with preprocess (original approach):');
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

const preprocessResult = institutionSchemaPreprocess.safeParse('');
if (preprocessResult.success) {
  console.log(`✓ Preprocess validation passed: ${JSON.stringify(preprocessResult.data)}`);
} else {
  console.log(`✗ Preprocess validation failed:`);
  preprocessResult.error.errors.forEach(err => {
    console.log(`  - ${err.message}`);
  });
}

// Test the actual issue - maybe the problem is that .optional() doesn't work
// when the field is present but empty
console.log('\n4. Testing if .optional() works with empty string:');
const testOptional = z.string().optional();
const optionalResult = testOptional.safeParse('');
console.log(`z.string().optional() with '': ${optionalResult.success ? `✓ ${JSON.stringify(optionalResult.data)}` : `✗ ${optionalResult.error.errors[0]?.message}`}`);

// The issue might be that z.string().optional() means "field can be missing"
// but if the field IS present with value '', it still needs to be a valid string
// Empty string IS a valid string, so it passes string validation
// But then .optional() doesn't help because the value is present

console.log('\n5. Testing the actual working pattern from liability:');
const liabilityPattern = z.string()
  .max(VALIDATION_LIMITS.institution.max, `Institution name must be less than ${VALIDATION_LIMITS.institution.max} characters`)
  .trim()
  .optional()
  .transform(e => e === '' ? undefined : e);

const liabilityResult = liabilityPattern.safeParse('');
if (liabilityResult.success) {
  console.log(`✓ Liability pattern passed: ${JSON.stringify(liabilityResult.data)}`);
} else {
  console.log(`✗ Liability pattern failed:`);
  liabilityResult.error.errors.forEach(err => {
    console.log(`  - ${err.message}`);
  });
}

// Compare order - liability has .max() BEFORE .trim()
console.log('\n6. Testing order difference:');
const order1 = z.string().trim().max(100).optional().transform(e => e === '' ? undefined : e);
const order2 = z.string().max(100).trim().optional().transform(e => e === '' ? undefined : e);

const r1 = order1.safeParse('');
const r2 = order2.safeParse('');

console.log(`trim().max().optional(): ${r1.success ? `✓ ${JSON.stringify(r1.data)}` : `✗ ${r1.error.errors[0]?.message}`}`);
console.log(`max().trim().optional(): ${r2.success ? `✓ ${JSON.stringify(r2.data)}` : `✗ ${r2.error.errors[0]?.message}`}`);


