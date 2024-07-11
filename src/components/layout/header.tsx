"use client";
import { generateEmbeddings } from "@/actions/knowledgebase-embeddings";
import React from "react";
import toast from "react-hot-toast";

const Header = () => {
  const handleClick = async () => {
    await generateEmbeddings();
  };
  return (
    <div className="">
      <header className="flex justify-between w-full p-4">
        <h1 className="font-semibold">RAG ChatBot With GROQ & Vercel AI SDK</h1>
        <button
          className="bg-white px-6 py-2 rounded-md shadow-md text-black"
          onClick={handleClick}
        >
          Generate Embeddings
        </button>
      </header>
    </div>
  );
};

export default Header;
