import 'server-only';
import { z } from 'zod';

export function strictJsonSchema(schema: z.ZodType, name: string) {
  const { $schema: _draft, ...jsonSchema } = z.toJSONSchema(schema, { target: 'draft-7' });
  return {
    type: 'json_schema' as const,
    json_schema: {
      name,
      strict: true,
      schema: jsonSchema,
    },
  };
}
