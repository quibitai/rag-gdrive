"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { Message } from "ai";
import ChatMessage from "@/components/chat-message";
import Image from "next/image";
import { motion } from "framer-motion";

interface ChatMessagesProps extends HTMLAttributes<HTMLDivElement> {
  messages: Message[];
}

const ChatMessages = ({ className, ...props }: ChatMessagesProps) => {
  const inverseMessages = [...props.messages].reverse();

  return (
    <>
      <div className="flex mt-5 flex-col items-center justify-center">
        <Image
          src="/chatbot.svg"
          alt="chatbot icon"
          height={70}
          width={70}
          
        />
        <motion.div
          className="flex items-center justify-center mt-2 text-neutral-800 font-bold"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          How can I help you?
        </motion.div>
      </div>
      <div
        {...props}
        className={cn(
          "flex flex-col-reverse gap-3 overflow-y-auto flex-grow py-3 no-scrollbar",
          className
        )}
      >
        <div className="flex-1 flex-grow" />
        {inverseMessages.map((message) => {
          const isUserMessage = message.role === "user";
          return (
            <ChatMessage
              key={message.id}
              message={message}
              isUserMessage={isUserMessage}
            />
          );
        })}
      </div>
    </>
  );
};

export default ChatMessages;
