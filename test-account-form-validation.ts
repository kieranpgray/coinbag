import { z } from 'zod';

// Copy the actual schema from accounts.ts
const VALIDATION_LIMITS = {
  institution: { min: 1, max: 100 },
  accountName: { min: 1, max: 100 },
  balance: { max: 99999999.99 },
} as const;

const institutionSchema = z.string()
  .trim()
  .max(VALIDATION_LIMITS.institution.max, `Institution name must be less than ${VALIDATION_LIMITS.institution.max} characters`)
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return val;
  });

const accountNameSchema = z.string()
  .min(VALIDATION_LIMITS.accountName.min, `Account name must be at least ${VALIDATION_LIMITS.accountName.min} character`)
  .max(VALIDATION_LIMITS.accountName.max, `Account name must be less than ${VALIDATION_LIMITS.accountName.max} characters`)
  .trim()
  .refine(name => name.length > 0 && !/^\s*$/.test(name), "Account name can't be empty.");

const balanceSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    return isNaN(num) ? undefined : num;
  },
  z.number({
    required_error: "Balance is required",
    invalid_type_error: "Please enter a valid amount"
  })
    .max(VALIDATION_LIMITS.balance.max, `Balance cannot exceed ${VALIDATION_LIMITS.balance.max}`)
    .refine(value => /^-?\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Balance can have at most 2 decimal places')
);

const accountTypeSchema = z.string()
  .min(1, "Account type can't be empty.")
  .trim();

const datetimeSchema = z.string()
  .refine(
    (val) => {
      if (val.includes('T') && val.includes('Z')) return true;
      if (val.includes('T')) return true;
      const parsed = Date.parse(val);
      return !isNaN(parsed);
    },
    'Invalid datetime format'
  );

export const accountCreateSchema = z.object({
  institution: institutionSchema,
  accountName: accountNameSchema,
  balance: balanceSchema,
  accountType: accountTypeSchema,
  currency: z.string().min(3).max(3).default('AUD').optional(),
  creditLimit: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'number' ? val : parseFloat(String(val));
      return isNaN(num) ? undefined : num;
    },
    z.number({
      required_error: "Credit limit is required",
      invalid_type_error: "Please enter a valid amount"
    })
      .min(0, 'Credit limit must be positive')
      .max(VALIDATION_LIMITS.balance.max, `Credit limit cannot exceed ${VALIDATION_LIMITS.balance.max}`)
      .refine(value => /^\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Credit limit can have at most 2 decimal places')
      .optional()
  ),
  balanceOwed: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'number' ? val : parseFloat(String(val));
      return isNaN(num) ? undefined : num;
    },
    z.number({
      required_error: "Balance owed is required",
      invalid_type_error: "Please enter a valid amount"
    })
      .min(0, 'Balance owed must be positive')
      .max(VALIDATION_LIMITS.balance.max, `Balance owed cannot exceed ${VALIDATION_LIMITS.balance.max}`)
      .refine(value => /^\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Balance owed can have at most 2 decimal places')
      .optional()
  ),
  lastUpdated: datetimeSchema,
  hidden: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.accountType === 'Credit Card' || data.accountType === 'Loan') {
      return data.creditLimit !== undefined && data.balanceOwed !== undefined;
    }
    return true;
  },
  {
    message: 'Credit limit and balance owed are required for Credit Card and Loan accounts',
    path: ['creditLimit'],
  }
);

console.log('Testing accountCreateSchema with empty institution:\n');

// Simulate form submission with empty institution
const testCases = [
  {
    name: 'Bank Account without institution',
    data: {
      institution: '',
      accountName: 'Test Account',
      balance: 1000,
      accountType: 'Bank Account',
      lastUpdated: new Date().toISOString(),
      hidden: false,
    }
  },
  {
    name: 'Bank Account with whitespace institution',
    data: {
      institution: '   ',
      accountName: 'Test Account',
      balance: 1000,
      accountType: 'Bank Account',
      lastUpdated: new Date().toISOString(),
      hidden: false,
    }
  },
  {
    name: 'Bank Account without institution field',
    data: {
      accountName: 'Test Account',
      balance: 1000,
      accountType: 'Bank Account',
      lastUpdated: new Date().toISOString(),
      hidden: false,
    }
  },
  {
    name: 'Bank Account with valid institution',
    data: {
      institution: 'ANZ',
      accountName: 'Test Account',
      balance: 1000,
      accountType: 'Bank Account',
      lastUpdated: new Date().toISOString(),
      hidden: false,
    }
  },
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = accountCreateSchema.safeParse(testCase.data);
  
  if (result.success) {
    const institutionValue = result.data.institution;
    const shouldBeUndefined = !testCase.data.institution || testCase.data.institution.trim() === '';
    
    if (shouldBeUndefined && institutionValue === undefined) {
      console.log(`✓ ${testCase.name}: institution = ${JSON.stringify(institutionValue)}`);
      passed++;
    } else if (!shouldBeUndefined && institutionValue === testCase.data.institution?.trim()) {
      console.log(`✓ ${testCase.name}: institution = ${JSON.stringify(institutionValue)}`);
      passed++;
    } else {
      console.log(`✗ ${testCase.name}: Expected ${shouldBeUndefined ? 'undefined' : testCase.data.institution}, got ${JSON.stringify(institutionValue)}`);
      failed++;
    }
  } else {
    console.log(`✗ ${testCase.name}: VALIDATION FAILED`);
    result.error.errors.forEach(err => {
      console.log(`  - ${err.path.join('.')}: ${err.message}`);
    });
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\n❌ Schema validation is failing - need to fix!');
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
}





