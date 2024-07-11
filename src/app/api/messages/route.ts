import {
  LangChainStream,
  StreamingTextResponse,
  Message as VercelMessage,
} from "ai";

import { chatbotPrompt as localChatbotPrompt } from "@/helper/chatbot.prompt";
import { MessageArraySchema } from "@/lib/validator/message";
import { ChatGroq } from "@langchain/groq";
import {
  ChatPromptTemplate,
  PromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { store } from "@/lib/vector";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { UpstashRedisCache } from "@langchain/community/caches/upstash_redis";
import { Redis } from "@upstash/redis";

export async function POST(req: Request) {
  try {
    const chatbotPrompt = localChatbotPrompt;
    const { messages } = await req.json();
    const parsedMessages = MessageArraySchema.parse(messages);
    const currentMessageContent = parsedMessages[messages.length - 1].content;

    const cache = new UpstashRedisCache({
      client: Redis.fromEnv(),
    });

    const chatHistory = parsedMessages
      .slice(0, -1)
      // @ts-ignore
      .map((msg: VercelMessage) => {
        return msg.role === "user"
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content);
      });

    const { stream, handlers } = LangChainStream();

    // LLM Models //
    const chatModel = new ChatGroq({
      modelName: "llama3-8b-8192",
      streaming: true,
      temperature: 0.2,
      callbacks: [handlers],
      maxTokens: 4000,
      cache,
    });
    const rephrasingModel = new ChatGroq({
      modelName: "llama3-8b-8192",
      cache,
    });

    // Rephrase the chat history to a prompt - for index retrieval
    const rephrasePrompt = ChatPromptTemplate.fromMessages([
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
      [
        "user",
        "Given the above conversation, generate a search query to look up in order to get the information relevant to the current question.\n" +
          "Don't leave out any relevant keywords. Only return the query and no other text",
      ],
    ]);

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", chatbotPrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
    ]);

    // CHAINS //
    const combineDocsChain = await createStuffDocumentsChain({
      llm: chatModel,
      prompt,
      documentPrompt: PromptTemplate.fromTemplate(`
          Page Content: {page_content}
          `),
      documentSeparator: "\n--------------------------------\n",
    });

    const retriever = store.asRetriever();

    const historyAwareRetrierChain = await createHistoryAwareRetriever({
      llm: rephrasingModel,
      retriever,
      rephrasePrompt,
    });
    const retrievalChain = await createRetrievalChain({
      combineDocsChain,
      retriever: historyAwareRetrierChain,
    });

    retrievalChain.invoke({
      input: currentMessageContent,
      chat_history: chatHistory,
    });

    return new StreamingTextResponse(stream);
  } catch (err) {
    console.log(err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500, statusText: "INTERNAL SERVER ERROR" }
    );
  }
}
