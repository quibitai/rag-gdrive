// @ts-nocheck - Ignoring all type errors in this file due to version mismatch in AI SDK dependencies
import { type CoreMessage, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: CoreMessage[] } = await req.json();

  const result = await streamText({
    model: openai("gpt-4-turbo"),
    system:
      "You are a helpful assistant. Give all your responses in markdown format",
    messages,
  });

  return result.toAIStreamResponse();
}
