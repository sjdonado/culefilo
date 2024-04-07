import { Ai } from '@cloudflare/ai';

import type { AiTextGenerationOutput } from '@cloudflare/ai/dist/ai/tasks/text-generation';
type AiTextGenerationOutputWithResponse = Extract<
  AiTextGenerationOutput,
  { response?: string }
>;

import { AppLoadContext } from '@remix-run/cloudflare';

export function putKVRecord<T>(context: AppLoadContext, key: string, value: T) {
  return context.cloudflare.env.CULEFILO_KV.put(key, JSON.stringify(value));
}

export function getKVRecord<T>(context: AppLoadContext, key: string) {
  return context.cloudflare.env.CULEFILO_KV.get(key, { type: 'json' }) as Promise<T>;
}

export async function runLLMRequest(
  context: AppLoadContext,
  prompt: string,
  instruction = 'You are an international chef, your responses are short, concise and always returned in JSON object format.'
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

  const data = (await ai.run('@cf/mistral/mistral-7b-instruct-v0.1', {
    messages,
  })) as AiTextGenerationOutputWithResponse;

  return data.response!;
}
