"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export function AnalogClock() {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Calculate rotation angles
  const secondAngle = seconds * 6; // 360 / 60 = 6
  const minuteAngle = minutes * 6 + seconds * 0.1; // 360 / 60 = 6, plus smooth movement
  const hourAngle = hours * 30 + minutes * 0.5; // 360 / 12 = 30, plus smooth movement

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          当前时间
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Analog Clock Face */}
          <div className="relative w-48 h-48">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full"
            >
              {/* Clock face background */}
              <circle
                cx="100"
                cy="100"
                r="95"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-muted-foreground/20"
              />

              {/* Hour markers */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x1 = 100 + 75 * Math.cos(angle);
                const y1 = 100 + 75 * Math.sin(angle);
                const x2 = 100 + 85 * Math.cos(angle);
                const y2 = 100 + 85 * Math.sin(angle);
                const textX = 100 + 65 * Math.cos(angle);
                const textY = 100 + 65 * Math.sin(angle);
                const hour = i === 0 ? 12 : i;

                return (
                  <g key={i}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-foreground"
                    />
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs font-medium fill-foreground"
                    >
                      {hour}
                    </text>
                  </g>
                );
              })}

              {/* Minute markers */}
              {Array.from({ length: 60 }).map((_, i) => {
                if (i % 5 === 0) return null; // Skip hour positions
                const angle = (i * 6 - 90) * (Math.PI / 180);
                const x1 = 100 + 82 * Math.cos(angle);
                const y1 = 100 + 82 * Math.sin(angle);
                const x2 = 100 + 85 * Math.cos(angle);
                const y2 = 100 + 85 * Math.sin(angle);

                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-muted-foreground"
                  />
                );
              })}

              {/* Hour hand */}
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="55"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-foreground"
                transform={`rotate(${hourAngle}, 100, 100)`}
              />

              {/* Minute hand */}
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="35"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-foreground"
                transform={`rotate(${minuteAngle}, 100, 100)`}
              />

              {/* Second hand */}
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="30"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="text-primary"
                transform={`rotate(${secondAngle}, 100, 100)`}
              />

              {/* Center dot */}
              <circle
                cx="100"
                cy="100"
                r="4"
                fill="currentColor"
                className="text-primary"
              />
            </svg>
          </div>

          {/* Digital time display */}
          <div className="mt-3 text-center">
            <div className="text-2xl font-bold tabular-nums">
              {time.toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDate(time)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
