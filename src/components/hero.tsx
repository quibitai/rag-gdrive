"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import BlurShadowEffect from "./blur-shadow-effect";
import { HeroHighlight, Highlight } from "./layout/hero-highlight";
import { HeroFlipWords } from "./hero-flip-words";
import ChatWidget from "./chat-widget";

export function HomeHero() {
  return (
    <div className="relative">
      <HeroHighlight>
        <div className="flex justify-center items-center">
          <HeroFlipWords />
        </div>
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
          className="text-4xl mt-6 px-4 md:text-4xl lg:text-5xl font-bold text-neutral-700 dark:text-white max-w-4xl leading-snug lg:leading-normal text-center mx-auto "
        >
          Build Your Lightning Fast ChatBot
          <br />
          <Highlight className="text-black dark:text-white">
            with RAG 🚀
          </Highlight>
        </motion.h1>
      </HeroHighlight>
    </div>
  );
}
