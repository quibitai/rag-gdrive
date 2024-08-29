"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";

const Header = () => {
  const [darkMode, setDarkMode] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("darkMode") === "true"
      : false
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  const handleToggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="fixed top-0 left-0 right-0 w-full z-50">
      <header className="flex justify-between items-center min-w-[385px] max-w-[1200px] mx-auto h-[80px] px-4 backdrop-blur-sm">
        <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-300 dark:from-indigo-500 dark:to-purple-500 text-3xl">
          RAG CHATBOT
        </h1>
        <div className="flex items-center gap-5">
          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-md transition-colors duration-300 ease-in-out flex items-center justify-center"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? (
              <SunIcon className="text-yellow-500 w-6 h-6" />
            ) : (
              <MoonIcon className="text-gray-600 dark:text-gray-300 w-6 h-6" />
            )}
          </button>
          <div className="lg:flex hidden items-center gap-5">
            <button className="dark:bg-[#23272A] bg-white font-bold px-6 py-3 rounded-lg text-neutral-900 dark:text-white flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300 ease-in-out hover:bg-gray-200 dark:hover:bg-gray-700 border hover:border-gray-500 dark:hover:border-gray-300">
              Login
            </button>
            <button className="dark:bg-white bg-[#23272A] font-bold px-6 py-3 rounded-lg text-white dark:text-neutral-900 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-gray-200">
              Get Started
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Header;
