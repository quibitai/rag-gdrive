"use client";
import React, { useEffect, useState, useRef } from "react";
import ChatHeader from "@/components/chat-header";
import ChatInput from "@/components/chat-input";
import ChatMessages from "@/components/chat-messages";
import { useChat } from "ai/react";

export default function ChatPage() {
  // Add state to track loading and mounting
  const [isMounted, setIsMounted] = useState(false);
  // Add state to track our own loading state with safety timeout
  const [isActuallyLoading, setIsActuallyLoading] = useState(false);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageRef = useRef("");
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/messages",
  });

  // Ensure everything is mounted properly
  useEffect(() => {
    setIsMounted(true);
    console.log("Chat component mounted");
  }, []);

  // Monitor isLoading changes and implement safety timeout
  useEffect(() => {
    console.log("isLoading state changed:", isLoading);
    setIsActuallyLoading(isLoading);
    
    // Clear any existing timer
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    
    // If loading started, set a safety timeout
    if (isLoading) {
      console.log("Starting safety timeout for loading state");
      loadingTimerRef.current = setTimeout(() => {
        console.log("Safety timeout reached, forcing loading state to false");
        setIsActuallyLoading(false);
      }, 15000); // 15 seconds max loading time
    }
    
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [isLoading]);

  // Add useEffect to monitor message changes
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      console.log("Latest message:", {
        id: latestMessage.id,
        role: latestMessage.role,
        contentPreview: latestMessage.content.substring(0, 50) + "...",
        contentLength: latestMessage.content.length
      });
      
      // Check if "list files in drive" was just answered
      if (
        latestMessage.role === "assistant" && 
        lastMessageRef.current.toLowerCase().includes("list files") &&
        lastMessageRef.current.toLowerCase().includes("drive")
      ) {
        console.log("Detected 'list files' response - monitoring for stuck loading state");
        // Set a safety timer specifically for list files command
        setTimeout(() => {
          if (isLoading) {
            console.log("Loading still active after list files response - forcing reset");
            setIsActuallyLoading(false);
          }
        }, 5000); // Shorter timeout for known problematic command
      }
      
      // Store the last user message
      if (latestMessage.role === "user") {
        lastMessageRef.current = latestMessage.content;
      }
    }
  }, [messages, isLoading]);

  // Show loading state while the component is mounting
  if (!isMounted) {
    return (
      <div className="flex flex-col min-h-screen pt-20 pb-10 px-4">
        <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border">
          <ChatHeader />
          <div className="flex-1 overflow-auto p-4 min-h-[500px] flex items-center justify-center">
            <div className="animate-pulse text-gray-500">Loading chat interface...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pt-20 pb-10 px-4">
      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border">
        <ChatHeader />
        <div className="flex-1 overflow-auto p-4 min-h-[500px]">
          {messages.length === 0 && !isActuallyLoading ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Ask a question about your documents to get started!
            </div>
          ) : (
            <ChatMessages messages={messages} />
          )}
          {isActuallyLoading && messages.length > 0 && (
            <div className="p-2 mt-2 bg-gray-100 dark:bg-gray-700 rounded animate-pulse">
              AI is thinking...
            </div>
          )}
        </div>
        <div className="border-t p-4">
          <ChatInput
            handleInputChange={handleInputChange}
            input={input}
            handleSubmit={handleSubmit}
            isLoading={isActuallyLoading}
          />
        </div>
      </div>
    </div>
  );
} 