"use client";

import dynamic from "next/dynamic";

export const ShootingStarsClient = dynamic(
  () =>
    import("@/components/ui/shooting-stars").then((mod) => mod.ShootingStars),
  { ssr: false }
);
