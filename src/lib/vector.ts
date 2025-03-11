import { Index } from "@upstash/vector";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { UpstashVectorStore } from "@langchain/community/vectorstores/upstash";

// Create Ollama embeddings instance
const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434", // Ensure Ollama is running on the default port
});

// Create Upstash Vector index with credentials from environment variables
const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

// Create the vector store with a consistent namespace
export const store = new UpstashVectorStore(embeddings, {
  index,
  namespace: "rag-vercel-ai-bot", // Keep this consistent between storing and retrieving
});
