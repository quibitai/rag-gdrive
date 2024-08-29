"use client";
import ChatHeader from "@/components/chat-header";
import ChatInput from "@/components/chat-input";
import React from "react";
import { useChat } from "ai/react";
import ChatMessages from "@/components/chat-messages";
import Image from "next/image";

const ChatWidget = () => {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "api/chat",
  });

  const [isOpen, setIsOpen] = React.useState(false);
  const toggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-10 right-5 z-50">
      <div className="flex flex-col items-end">
        {isOpen && (
          <div className="relative">
            <div className="w-[350px] md:w-[450px] flex flex-col bg-white shadow-lg rounded-t-3xl rounded-b-xl h-[600px] max-h-[70vh] border">
              <ChatHeader />
              <div className="flex-1 border-t overflow-auto no-scrollbar">
                <ChatMessages messages={messages} />
              </div>
              <ChatInput
                handleInputChange={handleInputChange}
                input={input}
                handleSubmit={handleSubmit}
              />
            </div>
            <div className="absolute mt-2 left-0 bg-white rounded-xl shadow-md p-3 w-[205px]">
              <p className="text-neutral-800">
                Made With{" "}
                <a
                  className="text-[#AD49E1]"
                  href="https://www.envisiontech.agency/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Envision Tech
                </a>
              </p>
            </div>
          </div>
        )}
        <button
          onClick={toggle}
          className="mt-6 flex justify-center items-center cursor-pointer hover:scale-95 animate-in shadow-purple-300 shadow-md p-3 rounded-full"
        >
          <Image src="/chatbot.svg" alt="chatbot icon" height={50} width={50} />
        </button>
      </div>
    </div>
  );
};

export default ChatWidget;
