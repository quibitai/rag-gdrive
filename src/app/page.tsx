import ChatWidget from "@/components/chat-widget";
import { HomeHero } from "@/components/hero";
import React from "react";

const HomePage = () => {
  return (
    <div className="">
      <HomeHero />
      <ChatWidget />
    </div>
  );
};

export default HomePage;
