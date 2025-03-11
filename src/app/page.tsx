"use client";

import { HomeHero } from "@/components/hero";
import Footer from "@/components/layout/footer";
import React, { useEffect, useState } from "react";

const HomePage = () => {
  // Use state to track if the page is fully mounted
  const [isMounted, setIsMounted] = useState(false);

  // This ensures client-side hydration is complete before rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // If not mounted yet, show a minimal loading state with just the header
  if (!isMounted) {
    return (
      <div className="min-h-screen">
        <div className="flex justify-center items-center mt-20">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex max-w-[1200px] mx-auto">
        <HomeHero />
      </div>
      <hr className="border border-gray-100 dark:border-gray-700 mb-4" />
      <div className="flex max-w-[1200px] mx-auto">
        <Footer />
      </div>
    </div>
  );
};

export default HomePage;
