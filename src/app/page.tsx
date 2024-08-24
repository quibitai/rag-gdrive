import { HomeHero } from "@/components/hero";
import Footer from "@/components/layout/footer";
import React from "react";

const HomePage = () => {
  return (
    <div className="">
      <div className="flex max-w-[1200px] mx-auto">
        <HomeHero />
      </div>
      <hr className="border border-gray-100 dark:border-gray-700 mb-4" />
      <div className="flex  max-w-[1200px] mx-auto">
        <Footer />
      </div>
    </div>
  );
};

export default HomePage;
