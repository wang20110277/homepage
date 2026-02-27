"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useId } from "react";

interface ShootingStar {
  x: number;
  y: number;
  angle: number;
  scale: number;
  speed: number;
  distance: number;
}

interface ShootingStarsProps {
  minSpeed?: number;
  maxSpeed?: number;
  minDelay?: number;
  maxDelay?: number;
  starColor?: string;
  trailColor?: string;
  starWidth?: number;
  starHeight?: number;
  className?: string;
}

export const ShootingStars: React.FC<ShootingStarsProps> = ({
  minSpeed = 5,
  maxSpeed = 10,
  minDelay = 800,
  maxDelay = 1000,
  starColor = "#113e9aff",
  trailColor = "#e7eaebff",
  starWidth = 10,
  starHeight = 1,
  className,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rectRef = useRef<SVGRectElement>(null);
  const starRef = useRef<ShootingStar | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gradientId = useId();

  useEffect(() => {
    const svg = svgRef.current;
    const rect = rectRef.current;
    if (!svg || !rect) return;

    const getRandomStartPoint = () => {
      const side = Math.floor(Math.random() * 4);
      const offset = Math.random() * window.innerWidth;

      switch (side) {
        case 0:
          return { x: offset, y: 0, angle: 45 };
        case 1:
          return { x: window.innerWidth, y: offset, angle: 135 };
        case 2:
          return { x: offset, y: window.innerHeight, angle: 225 };
        case 3:
          return { x: 0, y: offset, angle: 315 };
        default:
          return { x: 0, y: 0, angle: 45 };
      }
    };

    let isRunning = true;

    const updateStarPosition = () => {
      const star = starRef.current;
      if (!star) return;

      const width = starWidth * star.scale;
      rect.setAttribute("x", String(star.x));
      rect.setAttribute("y", String(star.y));
      rect.setAttribute("width", String(width));
      const transformValue = `rotate(${star.angle}, ${star.x + width / 2}, ${star.y + starHeight / 2})`;
      rect.setAttribute("transform", transformValue);
    };

    const createStar = () => {
      if (!isRunning) return;

      const { x, y, angle } = getRandomStartPoint();
      starRef.current = {
        x,
        y,
        angle,
        scale: 1,
        speed: Math.random() * (maxSpeed - minSpeed) + minSpeed,
        distance: 0,
      };

      rect.style.display = "block";
      updateStarPosition();

      const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
      timeoutRef.current = setTimeout(createStar, randomDelay);
    };

    const animate = () => {
      if (!isRunning) return;

      const star = starRef.current;
      if (!star) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const newX =
        star.x + star.speed * Math.cos((star.angle * Math.PI) / 180);
      const newY =
        star.y + star.speed * Math.sin((star.angle * Math.PI) / 180);
      const newDistance = star.distance + star.speed;
      const newScale = 1 + newDistance / 100;

      if (
        newX < -20 ||
        newX > window.innerWidth + 20 ||
        newY < -20 ||
        newY > window.innerHeight + 20
      ) {
        starRef.current = null;
        rect.style.display = "none";
      } else {
        starRef.current = {
          ...star,
          x: newX,
          y: newY,
          distance: newDistance,
          scale: newScale,
        };
        updateStarPosition();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    createStar();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [minSpeed, maxSpeed, minDelay, maxDelay, starWidth, starHeight]);

  return (
    <svg
      ref={svgRef}
      className={cn("absolute inset-0 h-full w-full", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={trailColor} stopOpacity={0} />
          <stop offset="100%" stopColor={starColor} stopOpacity={1} />
        </linearGradient>
      </defs>
      <rect
        ref={rectRef}
        fill={`url(#${gradientId})`}
        width={starWidth}
        height={starHeight}
        display="none"
      />
    </svg>
  );
};
