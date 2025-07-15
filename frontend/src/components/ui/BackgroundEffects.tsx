import React, { useState, useEffect } from "react";

interface StaticAuraProps {
  size: number;
  color: string;
  initialX: string;
  initialY: string;
  blur?: number;
  opacity?: number;
  animationDelay?: number;
}

const StaticAura: React.FC<StaticAuraProps> = React.memo(
  ({
    size,
    color,
    initialX,
    initialY,
    blur = 80,
    opacity = 0.4,
    animationDelay = 0,
  }) => {
    return (
      <div
        className="absolute rounded-full aura-float"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: `radial-gradient(circle at center, ${color}${Math.floor(
            opacity * 255
          )
            .toString(16)
            .padStart(2, "0")} 0%, ${color}20 40%, transparent 70%)`,
          filter: `blur(${blur}px)`,
          left: initialX,
          top: initialY,
          transform: "translate3d(0, 0, 0)", // Force GPU acceleration
          animationDelay: `${animationDelay}s`,
        }}
      />
    );
  }
);

export const BackgroundEffects: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay rendering to improve initial load performance
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Optimized auras - same visual positions but static/CSS animated
  const auras = [
    // Large floating pink auras
    {
      size: 600,
      color: "#FF69B4",
      x: "10%",
      y: "20%",
      blur: 120,
      opacity: 0.4,
      delay: 0,
    },
    {
      size: 500,
      color: "#FF1493",
      x: "70%",
      y: "60%",
      blur: 100,
      opacity: 0.4,
      delay: 5,
    },

    // Purple auras
    {
      size: 550,
      color: "#9370DB",
      x: "80%",
      y: "10%",
      blur: 110,
      opacity: 0.4,
      delay: 10,
    },
    {
      size: 450,
      color: "#8A2BE2",
      x: "20%",
      y: "70%",
      blur: 90,
      opacity: 0.4,
      delay: 15,
    },

    // Blue auras
    {
      size: 480,
      color: "#4169E1",
      x: "50%",
      y: "40%",
      blur: 95,
      opacity: 0.4,
      delay: 8,
    },
    {
      size: 400,
      color: "#1E90FF",
      x: "30%",
      y: "80%",
      blur: 85,
      opacity: 0.4,
      delay: 12,
    },

    // Medium floating auras
    {
      size: 350,
      color: "#FF69B4",
      x: "60%",
      y: "25%",
      blur: 70,
      opacity: 0.4,
      delay: 3,
    },
    {
      size: 300,
      color: "#9370DB",
      x: "15%",
      y: "50%",
      blur: 65,
      opacity: 0.4,
      delay: 18,
    },
    {
      size: 320,
      color: "#4169E1",
      x: "85%",
      y: "70%",
      blur: 68,
      opacity: 0.4,
      delay: 7,
    },

    // Smaller accent auras
    {
      size: 250,
      color: "#FF1493",
      x: "40%",
      y: "15%",
      blur: 60,
      opacity: 0.4,
      delay: 14,
    },
    {
      size: 200,
      color: "#8A2BE2",
      x: "75%",
      y: "35%",
      blur: 55,
      opacity: 0.4,
      delay: 20,
    },
    {
      size: 220,
      color: "#1E90FF",
      x: "25%",
      y: "90%",
      blur: 58,
      opacity: 0.4,
      delay: 6,
    },
  ];

  if (!isVisible) {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at top left, var(--background-2) 0%, var(--background-1) 50%),
              radial-gradient(ellipse at bottom right, var(--background-2) 0%, var(--background-1) 50%)
            `,
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient background - theme aware */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at top left, var(--background-2) 0%, var(--background-1) 50%),
            radial-gradient(ellipse at bottom right, var(--background-2) 0%, var(--background-1) 50%)
          `,
        }}
      />

      {/* Static auras with CSS animations */}
      {auras.map((aura, index) => (
        <StaticAura
          key={index}
          size={aura.size}
          color={aura.color}
          initialX={aura.x}
          initialY={aura.y}
          blur={aura.blur}
          opacity={aura.opacity}
          animationDelay={aura.delay}
        />
      ))}

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          mixBlendMode: "soft-light",
        }}
      />
    </div>
  );
};

export default BackgroundEffects;
