import React from "react";
import Image from "next/image";

const ChatHeader = () => {
  return (
    <div className="h-[70px] p-5 flex items-center bg-[#AD49E1] text-white rounded-t-2xl">
      <Image
        src={"/chatbot.svg"}
        alt="chatbot icon"
        height={40}
        width={40}
        className="mr-3"
      />
      <div>
        <h3 className="font-bold text-white">RAG CHATBOT</h3>
      </div>
    </div>
  );
};

export default ChatHeader;