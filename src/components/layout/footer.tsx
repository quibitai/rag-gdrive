import React from "react";
import { FaYoutube, FaTwitter } from "react-icons/fa";
import Logo from "./logo";

const Footer = () => {
  return (
    <footer className="bg-white z-10 dark:bg-black w-full text-gray-700 dark:text-gray-300 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row lg:justify-between items-center">
          <div className="flex flex-col items-center lg:items-start">
            <div className="flex items-center justify-center mb-4 lg:mb-0">
              <Logo />
              <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-300 dark:from-indigo-500 dark:to-purple-500 font-bold text-xl ml-2">
                RAG-CHATBOT
              </h1>
            </div>
            <div className="mt-4 flex flex-col items-center lg:items-start gap-4 lg:gap-8">
              <p>
                Brought to You by{" "}
                <a
                  href="https://www.envisiontech.ai"
                  className="text-blue-500 dark:text-blue-300 cursor-pointer"
                >
                  EnvisionTech
                </a>
              </p>
              <div className="flex space-x-4">
                <FaYoutube size={25} className="cursor-pointer" />
                <FaTwitter size={25} className="cursor-pointer" />
              </div>
            </div>
          </div>
          <div className="mt-8 lg:mt-8 flex flex-col lg:flex-row gap-8 lg:gap-48 items-center lg:items-start">
            <div className="text-center lg:text-left">
              <h2 className="font-bold">PAGES</h2>
              <ul className="hidden lg:block">
                <li>Home</li>
                <li>FAQ</li>
              </ul>
            </div>
            <div className="text-center lg:text-left">
              <h2 className="font-bold">LEGAL</h2>
              <ul className="hidden lg:block">
                <li>Terms and Condition</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
            <div className="text-center lg:text-left">
              <h2 className="font-bold">CONTACT</h2>
              <p>support@oai-widget.com</p>
            </div>
          </div>
        </div>
        <div className="mt-8 lg:mt-20 text-center md:text-left">
          <p className="text-neutral-500 dark:text-neutral-300 text-sm mb-1">
            © EnvisionTech-AI. All rights reserved.
          </p>
          <p className="text-neutral-500 dark:text-neutral-300 text-sm">
            We are not in any way affiliated with OpenAI. Our widgets are
            powered by OpenAI, not made or endorsed by them.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
