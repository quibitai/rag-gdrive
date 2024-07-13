import React from "react";

const BlurShadowEffect = () => {
  return (
    <>
      <div className="bottom-0 top-[50%] bg-gradient-to-t dark:from-background left-0 right-0 absolute z-10 hidden dark:block scale-[1.1]"></div>
      <div className="absolute inset-x-0 bottom-0 h-40 w-full bg-gradient-to-b from-transparent via-white to-white scale-[1.1] pointer-events-none dark:hidden"></div>
    </>
  );
};

export default BlurShadowEffect;
