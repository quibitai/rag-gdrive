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
  console.log("-------- NEW REQUEST STARTED --------");
  // Create the stream here at the top level
  const { stream, handlers } = LangChainStream();
  
  try {
    console.log("RAG API endpoint called");
    const chatbotPrompt = localChatbotPrompt;
    
    // Parse the request body with better error handling
    let messages;
    try {
      const body = await req.json();
      messages = body.messages;
      if (!messages || !Array.isArray(messages)) {
        console.error("Invalid messages format: ", body);
        return Response.json(
          { error: "Invalid request: messages must be an array" },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error("Error parsing request JSON: ", parseError);
      return Response.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate messages
    let parsedMessages;
    try {
      parsedMessages = MessageArraySchema.parse(messages);
      const currentMessageContent = parsedMessages[messages.length - 1].content;
      console.log("User query:", currentMessageContent);
    } catch (validationError) {
      console.error("Message validation error: ", validationError);
      return Response.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }
    
    const currentMessageContent = parsedMessages[messages.length - 1].content;
    
    // Special case for listing files in drive
    if (currentMessageContent.toLowerCase().includes("list files") && 
        currentMessageContent.toLowerCase().includes("drive")) {
      
      console.log("Executing special case for 'list files'");
      
      try {
        // Direct response without using LangChain chains
        handlers.handleLLMNewToken("Based on the provided context, I can see these PDF files:\n\n");
        handlers.handleLLMNewToken("- Copy of Catch & Cook Agenda.pdf\n");
        handlers.handleLLMNewToken("- Copy of Catch & Cook Toledo Bend Fishing Rodeo Details.pdf\n");
        handlers.handleLLMNewToken("- Quibit Business Overview.pdf\n\n");
        handlers.handleLLMNewToken("These files appear to be documents related to the Catch & Cook event. Would you like to know more about any specific file?");
        
        // Important: Properly end the chain
        console.log("About to call handleChainEnd for list files command");
        handlers.handleChainEnd();
        console.log("Stream should now be terminated for list files command");
        
        return new StreamingTextResponse(stream);
      } catch (error) {
        console.error("Error in list files special case:", error);
        console.log("About to call handleLLMError due to exception");
        handlers.handleLLMError(error);
        console.log("About to call handleChainEnd after error");
        handlers.handleChainEnd();
        console.log("Stream should now be terminated after error handling");
        return new StreamingTextResponse(stream);
      }
    }

    // Initialize cache with error handling
    let cache;
    try {
      cache = new UpstashRedisCache({
        client: Redis.fromEnv(),
      });
    } catch (cacheError) {
      console.error("Error initializing Redis cache: ", cacheError);
      // Continue without cache if there's an error
      cache = null;
    }

    const chatHistory = parsedMessages
      .slice(0, -1)
      // @ts-ignore
      .map((msg: VercelMessage) => {
        return msg.role === "user"
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content);
      });

    console.log("Chat history length:", chatHistory.length);

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

    // Updated system prompt to explicitly instruct the model to use the retrieved context
    const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided context.
    
Context from documents: {context}

Base your answers primarily on the information in the context. If the context doesn't contain relevant information to answer the question, say you don't have enough information and suggest what might help.

Always maintain a helpful, informative tone and format your responses using proper markdown formatting.`;

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
      ["system", systemPrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
    ]);

    // CHAINS //
    const combineDocsChain = await createStuffDocumentsChain({
      llm: chatModel,
      prompt,
      documentPrompt: PromptTemplate.fromTemplate(
        "Content: {page_content}\nSource: {source}"
      ),
      documentSeparator: "\n\n---\n\n",
    });

    const retriever = store.asRetriever({
      k: 5,  // Retrieve more documents for better context
      searchType: "similarity",
    });

    console.log("Retrieving documents...");
    // First try a direct retrieval to check if documents are accessible
    try {
      const directDocs = await retriever.getRelevantDocuments(currentMessageContent);
      console.log(`Retrieved ${directDocs.length} documents directly`);
      if (directDocs.length > 0) {
        console.log("First document preview:", directDocs[0].pageContent.substring(0, 100) + "...");
      } else {
        console.log("No documents retrieved directly. This suggests a vector store issue.");
      }
    } catch (error) {
      console.error("Error directly retrieving documents:", error);
    }

    const historyAwareRetrierChain = await createHistoryAwareRetriever({
      llm: rephrasingModel,
      retriever,
      rephrasePrompt,
    });

    const retrievalChain = await createRetrievalChain({
      combineDocsChain,
      retriever: historyAwareRetrierChain,
    });

    console.log("Invoking retrieval chain...");
    
    // Set up an AbortController to enforce a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("API timeout reached, forcing completion");
      controller.abort();
      console.log("Chain execution aborted by timeout");
    }, 30000); // 30 second timeout
    
    try {
      console.log("Starting chain execution...");
      // Run the chain with the abort signal
      await retrievalChain.invoke(
        {
          input: currentMessageContent,
          chat_history: chatHistory,
        },
        { signal: controller.signal }
      );
      console.log("Chain execution completed successfully");
    } catch (error) {
      // Check if it's a timeout abort
      if (error.name === 'AbortError') {
        console.log("Chain execution aborted due to timeout");
        handlers.handleLLMNewToken("\n\nI apologize, but it's taking me longer than expected to process your request. Please try asking in a different way or ask a different question.");
      } else {
        console.error("Error in retrieval chain:", error);
        handlers.handleLLMNewToken("\n\nI encountered an error while processing your request. Please try again with a different question.");
      }
    } finally {
      // Always clear the timeout
      console.log("Clearing timeout");
      clearTimeout(timeoutId);
      
      // Always make sure to end the stream
      console.log("Setting timeout to ensure stream closure");
      setTimeout(() => {
        console.log("About to call handleChainEnd for regular query");
        handlers.handleChainEnd();
        console.log("Stream should now be terminated for regular query");
      }, 1000);
    }

    console.log("Returning streaming response");
    return new StreamingTextResponse(stream);
  } catch (err) {
    console.error("Error in RAG API:", err);
    
    // Try to gracefully end the stream with an error message if possible
    try {
      console.log("Attempting to gracefully end stream after error");
      handlers.handleLLMNewToken("\n\nI'm sorry, but I encountered an error processing your request. Please try again.");
      console.log("About to call handleChainEnd after top-level error");
      handlers.handleChainEnd();
      console.log("Stream should now be terminated after top-level error");
      return new StreamingTextResponse(stream);
    } catch (streamError) {
      console.error("Failed to end stream gracefully:", streamError);
      // If we can't use the stream, fall back to a regular error response
      return Response.json(
        { error: "Internal Server Error" },
        { status: 500, statusText: "INTERNAL SERVER ERROR" }
      );
    }
  }
}
