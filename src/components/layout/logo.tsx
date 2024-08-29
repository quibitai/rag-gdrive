import Image from "next/image";
import React from "react";

const Logo = () => {
  return (
    <Image
      src="/chatbot.svg"
      alt="RAG-CHATBOT Logo"
      width={30}
      height={30}
      className="mr-3"
    />
  );
};

export default Logo;
