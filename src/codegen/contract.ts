export const ALLOWED_GENERATED_PATHS = [
  'src/contracts.ts',
  'src/provider.ts',
  'src/notification-service.ts',
  'tests/notification-service.unit.test.ts',
  'tests/notification-service.api.test.ts',
] as const;

export const FIXED_TEMPLATE_FILES = ['package.json', 'tsconfig.json', 'vitest.config.ts'] as const;
