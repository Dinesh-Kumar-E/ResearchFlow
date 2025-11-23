import React, { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  animationDuration: number;
  animationDelay: number;
}

interface TwinklingStarsProps {
  count?: number;
  className?: string;
  minSize?: number;
  maxSize?: number;
}

export const TwinklingStars: React.FC<TwinklingStarsProps> = ({
  count = 100,
  className,
  minSize = 1,
  maxSize = 3,
}) => {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const newStars: Star[] = [];
    for (let i = 0; i < count; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100, // percentage
        y: Math.random() * 100, // percentage
        size: Math.random() * (maxSize - minSize) + minSize,
        opacity: Math.random() * 0.5 + 0.5, // 0.5 - 1.0
        animationDuration: Math.random() * 3 + 2, // 2-5s
        animationDelay: Math.random() * 5,
      });
    }
    setStars(newStars);
  }, [count, minSize, maxSize]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDuration: `${star.animationDuration}s`,
            animationDelay: `${star.animationDelay}s`,
          }}
        />
      ))}
    </div>
  );
};
