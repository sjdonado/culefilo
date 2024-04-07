import { Ai } from '@cloudflare/ai';
import type { AiTextGenerationOutput } from '@cloudflare/ai/dist/ai/tasks/text-generation';

import { AppLoadContext } from '@remix-run/cloudflare';
import { AI_DEFAULT_INSTRUCTION, AI_DEFAULT_MODEL } from '~/config/env.server';

type AiTextGenerationOutputWithResponse = Extract<
  AiTextGenerationOutput,
  { response?: string }
>;

export function putKVRecord<T>(context: AppLoadContext, key: string, value: T) {
  return context.cloudflare.env.CULEFILO_KV.put(key, JSON.stringify(value));
}

export function getKVRecord<T>(context: AppLoadContext, key: string) {
  return context.cloudflare.env.CULEFILO_KV.get(key, { type: 'json' }) as Promise<T>;
}

export async function runLLMRequest(
  context: AppLoadContext,
  prompt: string,
  instruction = AI_DEFAULT_INSTRUCTION,
  model = AI_DEFAULT_MODEL
) {
  // https://developers.cloudflare.com/workers-ai/configuration/bindings/
  // https://developers.cloudflare.com/workers-ai/models/mistral-7b-instruct-v0.1/
  const ai = new Ai(context.cloudflare.env.AI);

  const messages = [
    {
      role: 'system',
      content: instruction,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const data = (await ai.run(model, {
    messages,
  })) as AiTextGenerationOutputWithResponse;

  return data.response!;
}
