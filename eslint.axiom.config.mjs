import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const sourceFiles = ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}', 'tests/**/*.ts', 'e2e/**/*.ts'];

export default [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    files: sourceFiles,
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'warn',
        { max: 120, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ['warn', 12],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 4],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}', 'src/ai/**/*.{ts,tsx}', 'src/artifacts/**/*.{ts,tsx}', 'src/runner/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['app/**', '../app/**', '../../app/**', '../../../app/**'],
              message: 'Domain and service modules must not import from React components or Next app routes.',
            },
          ],
        },
      ],
    },
  },
];
