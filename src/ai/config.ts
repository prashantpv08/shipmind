import 'server-only';

export type LiveAiDescriptor = {
  providerName: 'groq';
  modelName: string;
};

export function liveAiDescriptor(): LiveAiDescriptor {
  return {
    providerName: 'groq',
    modelName: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  };
}

export const safeLiveAiDescriptor = liveAiDescriptor;
