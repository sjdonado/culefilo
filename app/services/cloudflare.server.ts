import { Ai } from '@cloudflare/ai';

import type { AppLoadContext } from '@remix-run/cloudflare';

export async function putKVRecord<T>(context: AppLoadContext, key: string, value: T) {
  return context.cloudflare.env.CULEFILO_KV.put(key, JSON.stringify(value));
}

export async function getKVRecord<T>(context: AppLoadContext, key: string) {
  return context.cloudflare.env.CULEFILO_KV.get(key, { type: 'json' }) as Promise<T>;
}

export async function getAllKVRecords<T>(context: AppLoadContext) {
  const data = await context.cloudflare.env.CULEFILO_KV.list();

  return Promise.all(
    data.keys.map(async ({ name }) => {
      const record = await getKVRecord<T>(context, name);
      return {
        id: name,
        ...record,
      };
    })
  );
}

export async function runLLMRequest(
  context: AppLoadContext,
  prompt: string,
  instruction: string
) {
  // https://developers.cloudflare.com/workers-ai/configuration/bindings/
  const ai = new Ai(context.cloudflare.env.AI);

  const messages = [
    {
      role: 'system',
      content: 'you are a culinary expert assistant',
    },
    {
      role: 'assistant',
      content: instruction,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const data = await ai.run('@hf/thebloke/llama-2-13b-chat-awq', {
    messages,
    max_tokens: 512, // default is 256
    stream: false,
  });

  // console.log(`[${runLLMRequest.name}] ${JSON.stringify({ prompt, data }, null, 2)}`);

  return (data as { response: string }).response;
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

  // console.log(
  //   `[${runSummarizationRequest.name}] ${JSON.stringify(
  //     { input, output: data.summary },
  //     null,
  //     2
  //   )}`
  // );

  return data.summary;
}

export async function runImageToTextRequest(context: AppLoadContext, image: number[]) {
  // https://developers.cloudflare.com/workers-ai/configuration/bindings/
  const ai = new Ai(context.cloudflare.env.AI);

  const data = await ai.run('@cf/unum/uform-gen2-qwen-500m', {
    image,
  });

  return data.description;
}
