import { FlipWords } from "./flip-word";

export function HeroFlipWords() {
  const words = ["Lang-Chain", "GROQ", "Vercel-AI-SDK", "Llama"];

  return (
    <div className="lex justify-center items-center px-4">
      <div className="sm:text-xl md:text-2xl mx-auto font-normal text-neutral-600 dark:text-neutral-400">
        Build in Top of
        <FlipWords words={words} />
      </div>
    </div>
  );
}
