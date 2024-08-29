"use client";
import { motion } from "framer-motion";
import { HeroHighlight, Highlight } from "./layout/hero-highlight";
import { HeroFlipWords } from "./hero-flip-words";
import { generateEmbeddings } from "@/actions/knowledgebase-embeddings";
import React from "react";
import toast from "react-hot-toast";

export function HomeHero() {
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
    <div >
      <HeroHighlight>
        <motion.h1
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: [20, -5, 0],
          }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0.0, 0.2, 1],
          }}
          className="text-4xl mt-6 w-full px-4 lg:text-[60px] font-extrabold text-neutral-800 dark:text-white leading-snug lg:leading-tight text-center md:text-left mx-auto"
        >
          The Easiest Way to Embed
          <br />
          <div className="flex items-center justify-center md:justify-start gap-1 lg:gap-2 w-full">
            <div className="text-neutral-800 dark:text-white">Your</div>
            <div>
              <Highlight>Custom GPT</Highlight>
            </div>
          </div>
        </motion.h1>

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: [20, -5, 0],
          }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0.0, 0.2, 1],
            delay: 0.2,
          }}
          className="text-neutral-400 dark:text-neutral-400 text-md mt-14 max-w-4xl mx-auto text-center md:text-left leading-snug px-4"
        >
          <strong className="font-bold">Pay only for what you use</strong>– add
          your own OpenAI key, and have complete control over your agents with
          the NEW Assistants API.
        </motion.div>

        {/* Button */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: [20, -5, 0],
          }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0.0, 0.2, 1],
            delay: 0.4,
          }}
          className="mt-10 max-w-4xl mx-auto flex justify-center md:justify-start px-4"
        >
          <button
            className="bg-[#23272A] font-bold px-6 py-3 rounded-lg text-white flex items-center justify-center gap-2 shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handleClick}
            disabled={loading}
          >
            Generate Embeddings
            <span role="img" aria-label="rocket">
              🚀
            </span>
          </button>
        </motion.div>
      </HeroHighlight>
    </div>
  );
}
