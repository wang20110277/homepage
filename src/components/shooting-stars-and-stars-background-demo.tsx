"use client";

import React from "react";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";

export default function ShootingStarsAndStarsBackgroundDemo() {
  return (
    <div className="relative flex h-[40rem] w-full flex-col items-center justify-center rounded-md bg-neutral-900">
      <h2 className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-2 text-center text-3xl font-medium tracking-tight text-transparent md:flex-row md:gap-8 md:text-5xl md:leading-tight">
        <span className="bg-gradient-to-b from-neutral-800 via-white to-white bg-clip-text">
          Shooting Star
        </span>
        <span className="text-lg font-thin text-white">x</span>
        <span className="bg-gradient-to-b from-neutral-800 via-white to-white bg-clip-text">
          Star Background
        </span>
      </h2>
      <ShootingStars />
      <StarsBackground />
    </div>
  );
}
