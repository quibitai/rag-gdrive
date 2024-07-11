"use client";
import { generateEmbeddings } from "@/actions/knowledgebase-embeddings";
import React from "react";
import toast from "react-hot-toast";

const Header = () => {
  const [loading, setLoading] = React.useState(false);
  const handleClick = async () => {
    setLoading(true);
    const promise = generateEmbeddings().finally(() => {
      setLoading(false);
    });
    toast.promise(promise, {
      loading: "Generating embeddings...",
      success: <b>Embeddings generated.</b>,
      error: <b className="text-red-400">Error in generating embeddings.</b>,
    });
  };
  return (
    <div className="">
      <header className="flex justify-between w-full p-4">
        <h1 className="font-semibold">RAG ChatBot With GROQ & Vercel AI SDK</h1>
        <button
          className="bg-white px-6 py-2 rounded-md shadow-md text-black disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleClick}
          disabled={loading}
        >
          Generate Embeddings
        </button>
      </header>
    </div>
  );
};

export default Header;
