# TypeScript Patterns Guide

This document outlines common TypeScript patterns used in this codebase to prevent common errors and ensure type safety.

## Table of Contents

1. [Handling Optional/Undefined Values](#handling-optionalundefined-values)
2. [Date Parsing Best Practices](#date-parsing-best-practices)
3. [Error Handling Type Patterns](#error-handling-type-patterns)
4. [Component Naming Conventions](#component-naming-conventions)
5. [Zod Schema Patterns](#zod-schema-patterns)

## Handling Optional/Undefined Values

### Problem

TypeScript's strict null checks require explicit handling of `undefined` and `null` values. Common errors:
- `TS18048`: Value is possibly 'undefined'
- `TS2345`: Type 'undefined' is not assignable to type 'string'

### Solutions

#### 1. Provide Default Values

```typescript
// ❌ Bad: dateAdded might be undefined
const dateAdded = entity.dateAdded;

// ✅ Good: Provide default value
const dateAdded = entity.dateAdded || new Date().toISOString().split('T')[0];
```

#### 2. Use Nullish Coalescing

```typescript
// ✅ Good: Use ?? for null/undefined
const incomes = data.incomes ?? [];
```

#### 3. Type Guards

```typescript
// ✅ Good: Check before use
if (file) {
  handleFile(file);
}

// Or use non-null assertion if you're certain
const file = files[0]!; // Only if you're 100% sure it exists
```

#### 4. Optional Chaining

```typescript
// ✅ Good: Safe property access
const userId = user?.id;
const role = membership?.role;
```

## Date Parsing Best Practices

### Problem

Date parsing often involves handling undefined values and invalid formats. Common errors:
- `TS2345`: Argument of type 'string | undefined' is not assignable
- `TS18048`: 'date' is possibly 'undefined'

### Solutions

#### 1. Validate Before Parsing

```typescript
// ✅ Good: Check if value exists and is valid
const parseDate = (dateStr: string | undefined): string => {
  if (!dateStr || dateStr.trim() === '') {
    return new Date().toISOString().split('T')[0];
  }
  // Validate format before parsing
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date().toISOString().split('T')[0];
  }
  return dateStr;
};
```

#### 2. Use Zod for Date Validation

```typescript
// ✅ Good: Use Zod schema with defaults
const dateAddedSchema = z.preprocess(
  (val) => {
    if (!val || val === '') {
      return new Date().toISOString().split('T')[0];
    }
    return String(val);
  },
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
);
```

#### 3. Handle Excel Serial Dates

```typescript
// ✅ Good: Convert Excel serial to ISO date
const parseExcelDate = (value: unknown): string => {
  if (typeof value === 'number') {
    // Excel serial date conversion
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString().split('T')[0];
};
```

## Error Handling Type Patterns

### Problem

Error handling requires proper typing to avoid `any` types and ensure type safety.

### Solutions

#### 1. Typed Error Objects

```typescript
// ✅ Good: Define error types
interface FieldError {
  field: string;
  message: string;
  value?: unknown;
}

interface RowError {
  rowNumber: number;
  entityType: EntityType;
  fields: FieldError[];
  rawData: Record<string, unknown>;
}
```

#### 2. Zod Error Handling

```typescript
// ✅ Good: Handle Zod errors properly
try {
  const result = schema.parse(data);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof z.ZodError) {
    const fieldErrors = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.path.reduce((obj, key) => obj?.[key], data),
    }));
    return { success: false, errors: fieldErrors };
  }
  throw error;
}
```

#### 3. Handle ZodIssue Properties

```typescript
// ⚠️ Note: ZodIssue doesn't always have 'input' property
// Use path instead for field identification
const getFieldValue = (issue: z.ZodIssue, data: unknown): unknown => {
  // Navigate to the field using path
  return issue.path.reduce((obj, key) => {
    if (obj && typeof obj === 'object' && key in obj) {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
};
```

## Component Naming Conventions

### Problem

Merged declaration conflicts occur when component names conflict with type names.

### Solutions

#### 1. Use Descriptive Internal Names

```typescript
// ❌ Bad: Conflicts with export
export const ExpenseBreakdown = memo(function ExpenseBreakdown() {
  // ...
});

// ✅ Good: Use internal name that doesn't conflict
export const ExpenseBreakdown = memo(function ExpenseBreakdownComponent() {
  // ...
});
```

#### 2. Separate Type and Component Names

```typescript
// ✅ Good: Type has different name
interface ExpenseBreakdownData {
  breakdown: ExpenseBreakdown[];
  totalAmount: number;
}

export const ExpenseBreakdown = memo(function ExpenseBreakdownComponent({
  breakdown,
  totalAmount,
}: ExpenseBreakdownData) {
  // ...
});
```

## Zod Schema Patterns

### Problem

Zod schemas need to handle optional values, preprocessors, and type transformations correctly.

### Solutions

#### 1. Optional Fields with Defaults

```typescript
// ✅ Good: Handle optional with default
const schema = z.object({
  dateAdded: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().optional(),
});
```

#### 2. Preprocess with Type Safety

```typescript
// ✅ Good: Preprocess with proper typing
const interestRateSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === '') {
      return undefined;
    }
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  },
  z.number().min(0).max(100).optional()
);
```

#### 3. Transform with Validation

```typescript
// ✅ Good: Transform with validation
const dateSchema = z.preprocess(
  (val) => {
    if (!val || val === '') {
      return new Date().toISOString().split('T')[0];
    }
    return String(val);
  },
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
);
```

## Common Anti-Patterns to Avoid

### 1. Using `any` Type

```typescript
// ❌ Bad
function processData(data: any) {
  return data.value;
}

// ✅ Good
function processData(data: { value: string }) {
  return data.value;
}
```

### 2. Ignoring Undefined Checks

```typescript
// ❌ Bad
const value = obj.property.subProperty;

// ✅ Good
const value = obj.property?.subProperty;
```

### 3. Unused Variables

```typescript
// ❌ Bad: Unused variable
const unused = computeValue();

// ✅ Good: Remove or prefix with _
const _unused = computeValue(); // If needed for debugging
```

## TypeScript Configuration

Our `tsconfig.json` includes strict settings:

- `strict: true` - Enables all strict type checking
- `noUnusedLocals: true` - Error on unused local variables
- `noUnusedParameters: true` - Error on unused parameters
- `noImplicitReturns: true` - Error when not all code paths return
- `noUncheckedIndexedAccess: true` - Require checks for array/object access

## Quick Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| TS6133 | Unused declaration | Remove or prefix with `_` |
| TS18048 | Possibly undefined | Add null check or default value |
| TS2345 | Type incompatibility | Fix type mismatch or add type guard |
| TS7030 | Not all paths return | Add return statement or return undefined |
| TS2395 | Merged declaration | Rename component or type |
| TS2304 | Cannot find name | Add missing import |
| TS2322 | Type assignment error | Fix type definition or assertion |

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Zod Documentation](https://zod.dev/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

