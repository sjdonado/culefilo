import { Ai } from '@cloudflare/ai';
import { AiSummarizationOutput } from '@cloudflare/ai/dist/ai/tasks/summarization';
import type { AiTextGenerationOutput } from '@cloudflare/ai/dist/ai/tasks/text-generation';

import { AppLoadContext } from '@remix-run/cloudflare';

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
  instruction: string
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

  const data = (await ai.run('@hf/thebloke/llama-2-13b-chat-awq', {
    messages,
    max_tokens: 512,
  })) as AiTextGenerationOutputWithResponse;

  console.log(`[${runLLMRequest.name}] ${JSON.stringify({ prompt, data }, null, 2)}`);

  return data.response ?? '';
}

export async function runSummarizationRequest(
  context: AppLoadContext,
  reviews: string[]
) {
  // https://developers.cloudflare.com/workers-ai/configuration/bindings/
  const ai = new Ai(context.cloudflare.env.AI);

  // it seems that this model does not accept intructions
  // const input = `The restaurant named "${name}" can be described by its reviews : ${reviews.join( '. ')}`;
  const input = reviews.join('. ');

  const data = await ai.run('@cf/facebook/bart-large-cnn', {
    input_text: input,
    max_length: 3072, // the default is 1024
  });

  console.log(
    `[${runSummarizationRequest.name}] ${JSON.stringify(
      { input, output: data.summary },
      null,
      2
    )}`
  );

  return data.summary;
}
