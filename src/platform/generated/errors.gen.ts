/* This file is auto-generated from the reviewed OpenAPI error response. */
/* @hey-api/openapi-ts 0.99.0 does not export Zod validators for error responses. */

import { z } from 'zod';

import type { GenerateWorkItemDraftError } from './types.gen';

const schema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "properties": {
    "error": {
      "additionalProperties": false,
      "properties": {
        "code": {
          "const": "CLARIFICATION_REQUIRED",
          "type": "string"
        },
        "details": {
          "additionalProperties": false,
          "properties": {
            "blockers": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "category": {
                    "maxLength": 100,
                    "minLength": 1,
                    "type": "string"
                  },
                  "clarification": {
                    "anyOf": [
                      {
                        "additionalProperties": false,
                        "properties": {
                          "affectedEntityIds": {
                            "items": {
                              "pattern": "^[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]{1,120}$",
                              "type": "string"
                            },
                            "maxItems": 100,
                            "type": "array"
                          },
                          "id": {
                            "maxLength": 200,
                            "minLength": 1,
                            "type": "string"
                          },
                          "question": {
                            "maxLength": 1000,
                            "minLength": 1,
                            "type": "string"
                          },
                          "whyItMatters": {
                            "maxLength": 1000,
                            "minLength": 1,
                            "type": "string"
                          }
                        },
                        "required": [
                          "id",
                          "question",
                          "whyItMatters",
                          "affectedEntityIds"
                        ],
                        "type": "object"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "description": {
                    "maxLength": 2000,
                    "minLength": 1,
                    "type": "string"
                  },
                  "gapId": {
                    "maxLength": 200,
                    "minLength": 1,
                    "type": "string"
                  },
                  "severity": {
                    "maxLength": 100,
                    "minLength": 1,
                    "type": "string"
                  },
                  "title": {
                    "maxLength": 500,
                    "minLength": 1,
                    "type": "string"
                  },
                  "truthStatus": {
                    "const": "UNKNOWN",
                    "type": "string"
                  },
                  "type": {
                    "maxLength": 100,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "gapId",
                  "type",
                  "category",
                  "title",
                  "description",
                  "severity",
                  "truthStatus",
                  "clarification"
                ],
                "type": "object"
              },
              "maxItems": 100,
              "minItems": 1,
              "type": "array"
            }
          },
          "required": [
            "blockers"
          ],
          "type": "object"
        },
        "message": {
          "minLength": 1,
          "type": "string"
        },
        "requestId": {
          "minLength": 1,
          "type": "string"
        },
        "retryable": {
          "const": false,
          "type": "boolean"
        }
      },
      "required": [
        "code",
        "message",
        "requestId",
        "retryable",
        "details"
      ],
      "type": "object"
    }
  },
  "required": [
    "error"
  ],
  "type": "object"
} as const;

export const zGenerateWorkItemDraftError = z.fromJSONSchema(schema as never) as z.ZodType<GenerateWorkItemDraftError>;
