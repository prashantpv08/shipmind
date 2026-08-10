import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const sourceFiles = ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}', 'scripts/**/*.ts', 'tests/**/*.ts', 'e2e/**/*.ts'];

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'src/platform/generated/**',
      'test-results/**',
    ],
  },
  {
    files: sourceFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
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

export default config;
