import { z } from "zod";

export const MessageSchema = z.object({
  content: z.string(),
  role: z.enum(["user", "system", "assistant"]),
});

// array validator
export const MessageArraySchema = z.array(MessageSchema);
