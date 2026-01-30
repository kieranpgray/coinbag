module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // Typography: Prefer design tokens (text-h1, text-h2, text-data-lg, etc.) over raw Tailwind classes
    // See docs/DESIGN_SYSTEM_TYPOGRAPHY.md for guidelines
    // Future: Add custom rule to flag text-xl, text-2xl, text-3xl, text-4xl and arbitrary values like text-[30px]
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // Allow any in test mocks
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
  ],
};

