import { ChatRequestOptions, Message } from "ai";
import React, { ChangeEvent, FormEvent } from "react";

type ChatInputProps = {
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  input: string;
  className?: string;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
};

const ChatInput = ({
  handleInputChange,
  handleSubmit,
  input,
  isLoading = false,
}: ChatInputProps) => {
  return (
    <div className="p-3 flex justify-center items-center border-t">
      <form className="w-full flex" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => {
            handleInputChange(e);
          }}
          className="p-2 rounded-md outline-none border-none w-full text-gray-700 dark:bg-gray-700 dark:text-white"
          placeholder="What would you like to know?"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className={`ml-2 ${isLoading ? 'text-gray-400' : 'text-[#AD49E1]'}`}
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? '...' : '➤'}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;