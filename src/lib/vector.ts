import { Index } from "@upstash/vector";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { UpstashVectorStore } from "@langchain/community/vectorstores/upstash";

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
});

const index = new Index();

export const store = new UpstashVectorStore(embeddings, {
  index,
  namespace: "rag-vercel-ai-bot",
});
