# Contributing Guide

This guide helps you contribute to the codebase while maintaining code quality and preventing deployment failures.

## Pre-Commit Requirements

Before committing code, ensure:

1. **Type Checking**: No TypeScript errors
2. **Linting**: Code passes ESLint checks
3. **Tests**: All tests pass (if applicable)

### Running Checks Locally

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Run tests
pnpm test --run

# Build check (validates everything)
pnpm build:check
```

### Pre-Commit Hooks

Husky automatically runs checks before each commit:

- TypeScript type checking
- ESLint validation
- Test suite (if applicable)

If checks fail, the commit will be blocked. Fix errors and try again.

## Type Checking Workflow

### Development

1. **Write code** in your editor
2. **Editor shows errors** (if configured with TypeScript)
3. **Fix errors** as you go
4. **Run `pnpm type-check`** before committing

### Before Committing

```bash
# Quick check
pnpm type-check

# If errors exist, fix them:
# 1. Read error messages
# 2. Check docs/TYPESCRIPT_PATTERNS.md for patterns
# 3. Fix errors
# 4. Re-run type-check
```

### Common TypeScript Errors

See `docs/TYPESCRIPT_PATTERNS.md` for detailed solutions to common errors:

- **TS6133**: Unused declarations - Remove or prefix with `_`
- **TS18048**: Possibly undefined - Add null check or default
- **TS2345**: Type incompatibility - Fix type mismatch
- **TS7030**: Missing return - Add return statement
- **TS2395**: Merged declaration - Rename component/type

## CI/CD Expectations

### GitHub Actions

Every push and pull request triggers:

1. **Type Check Job**: Validates TypeScript compilation
2. **Lint Job**: Validates code style
3. **Test Job**: Runs test suite
4. **Build Job**: Validates production build

### Required Checks

All checks must pass before:
- Merging pull requests
- Deploying to production

### If CI Fails

1. **Check CI logs** for specific errors
2. **Reproduce locally**: Run the same commands
3. **Fix errors** following patterns in `docs/TYPESCRIPT_PATTERNS.md`
4. **Re-run checks** locally before pushing

## Running Validation Locally

### Full Validation

```bash
# Run all checks
pnpm type-check && pnpm lint && pnpm test --run && pnpm build
```

### Individual Checks

```bash
# Type check only
pnpm type-check

# Lint only
pnpm lint

# Tests only
pnpm test --run

# Build only (includes type check)
pnpm build
```

## Code Style

### TypeScript

- Use strict type checking
- Avoid `any` types
- Handle `undefined` explicitly
- Use type guards for nullable values

### React Components

- Use TypeScript for all components
- Define prop types with interfaces
- Use `memo` for performance when appropriate
- Follow naming conventions (see `docs/TYPESCRIPT_PATTERNS.md`)

### Error Handling

- Use typed error objects
- Handle Zod errors properly
- Provide meaningful error messages

## Build Process

### Local Build

```bash
# Development build
pnpm build

# Production build (with env vars)
pnpm build:prod
```

### Build Validation

The build process includes:

1. **Environment validation** (`scripts/validate-build-env.js`)
   - Checks `VITE_DATA_SOURCE` in production
   - Validates required environment variables

2. **TypeScript validation** (`tsc --noEmit`)
   - Type checks all files
   - Fails build on errors

3. **Vite build** (`vite build`)
   - Bundles application
   - Optimizes for production

## Troubleshooting

### Type Check Fails

1. **Read error messages** carefully
2. **Check file and line number**
3. **Review `docs/TYPESCRIPT_PATTERNS.md`** for solutions
4. **Fix errors incrementally** (one file at a time)

### Build Fails

1. **Check environment variables** are set
2. **Run type check** separately: `pnpm type-check`
3. **Check build logs** for specific errors
4. **Verify dependencies** are installed: `pnpm install`

### Pre-Commit Hook Fails

1. **Fix errors** shown in hook output
2. **Re-run checks** manually: `pnpm type-check && pnpm lint`
3. **Commit again** once checks pass

## Best Practices

### 1. Fix Errors Early

Don't accumulate TypeScript errors. Fix them as you write code.

### 2. Use Type Guards

Always check for `undefined`/`null` before using values.

### 3. Provide Defaults

Use default values for optional fields in schemas.

### 4. Test Locally

Run all checks locally before pushing to avoid CI failures.

### 5. Follow Patterns

Refer to `docs/TYPESCRIPT_PATTERNS.md` for common patterns.

## Getting Help

If you're stuck:

1. **Check documentation**: `docs/TYPESCRIPT_PATTERNS.md`
2. **Review error messages**: They often provide solutions
3. **Check similar code**: Look for examples in the codebase
4. **Ask for help**: Reach out to the team

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Zod Documentation](https://zod.dev/)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)

